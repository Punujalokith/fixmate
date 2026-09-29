// Socket.IO: authentication, live booking updates and chat.
import { io, type Socket } from 'socket.io-client';
import { bearer, createProviderWithService, createTestApp, hoursFromNow, registerUser, type TestContext } from './helpers.js';

type Event = { event: string; payload: any };

function connect(baseUrl: string, token: string): Promise<{ socket: Socket; events: Event[] }> {
  return new Promise((resolve, reject) => {
    const socket = io(baseUrl, { auth: { token }, transports: ['websocket'], reconnection: false });
    const events: Event[] = [];
    socket.onAny((event, payload) => events.push({ event, payload }));
    socket.on('ready', () => resolve({ socket, events }));
    socket.on('error', (e) => reject(new Error(e?.message ?? 'socket error')));
    socket.on('connect_error', reject);
  });
}

const waitFor = async (events: Event[], predicate: (e: Event) => boolean, ms = 3000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const found = events.find(predicate);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Timed out waiting for socket event');
};

describe('Realtime (e2e)', () => {
  let ctx: TestContext;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    sockets.forEach((s) => s.close());
    await ctx.app.close();
  });

  it('refuses sockets without a valid token', async () => {
    await expect(connect(ctx.baseUrl, 'bad-token')).rejects.toThrow();
  });

  it('pushes booking updates and chat messages live', async () => {
    const { provider, service } = await createProviderWithService(ctx);
    const customer = await registerUser(ctx);
    const P = await connect(ctx.baseUrl, provider.accessToken);
    const C = await connect(ctx.baseUrl, customer.accessToken);
    sockets.push(P.socket, C.socket);

    const booking = (
      await ctx.http
        .post('/api/v1/bookings')
        .set(bearer(customer.accessToken))
        .send({ serviceId: service.id, scheduledAt: hoursFromNow(48), addressLine: '1 Test Rd', city: 'Matara' })
        .expect(201)
    ).body;

    await waitFor(P.events, (e) => e.event === 'booking:updated' && e.payload.id === booking.id);
    await waitFor(P.events, (e) => e.event === 'notification:new' && e.payload.type === 'BOOKING_CREATED');

    await ctx.http.post(`/api/v1/bookings/${booking.id}/accept`).set(bearer(provider.accessToken)).expect(200);
    await waitFor(C.events, (e) => e.event === 'booking:updated' && e.payload.status === 'ACCEPTED');

    // Chat over the socket with acknowledgement
    const ack = await C.socket.timeout(3000).emitWithAck('message:send', { bookingId: booking.id, body: 'See you tomorrow' });
    expect(ack).toMatchObject({ ok: true, data: { body: 'See you tomorrow' } });
    await waitFor(P.events, (e) => e.event === 'message:new' && e.payload.body === 'See you tomorrow');

    // Typing indicator goes only to the other person
    await P.socket.timeout(3000).emitWithAck('typing', { bookingId: booking.id, isTyping: true });
    await waitFor(C.events, (e) => e.event === 'typing' && e.payload.isTyping === true);

    // Read receipts
    const unread = (await ctx.http.get('/api/v1/chats/unread').set(bearer(provider.accessToken)).expect(200)).body;
    expect(unread[booking.id]).toBe(1);
    await P.socket.timeout(3000).emitWithAck('message:read', { bookingId: booking.id });
    await waitFor(C.events, (e) => e.event === 'message:read' && e.payload.bookingId === booking.id);
  });

  it('rejects invalid or unauthorised chat messages', async () => {
    const { service } = await createProviderWithService(ctx);
    const owner = await registerUser(ctx);
    const stranger = await registerUser(ctx);
    const booking = (
      await ctx.http
        .post('/api/v1/bookings')
        .set(bearer(owner.accessToken))
        .send({ serviceId: service.id, scheduledAt: hoursFromNow(48), addressLine: '1 Test Rd', city: 'Matara' })
        .expect(201)
    ).body;

    const S = await connect(ctx.baseUrl, stranger.accessToken);
    sockets.push(S.socket);
    expect(await S.socket.timeout(3000).emitWithAck('message:send', { bookingId: booking.id, body: 'hi' })).toMatchObject({ ok: false });
    expect(await S.socket.timeout(3000).emitWithAck('message:send', { bookingId: 'not-a-uuid', body: 'hi' })).toMatchObject({
      ok: false,
      error: 'Invalid bookingId',
    });

    const O = await connect(ctx.baseUrl, owner.accessToken);
    sockets.push(O.socket);
    expect(await O.socket.timeout(3000).emitWithAck('message:send', { bookingId: booking.id, body: '   ' })).toMatchObject({
      ok: false,
      error: 'Message is empty',
    });
  });
});
