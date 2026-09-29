import { ProfileScreen } from '@/components/ProfileScreen';

export default function CustomerProfile() {
  return (
    <ProfileScreen
      menu={[
        { icon: 'person-outline', label: 'Edit profile', href: '/edit-profile' },
        { icon: 'location-outline', label: 'My addresses', href: '/addresses' },
        { icon: 'heart-outline', label: 'Favourite providers', href: '/favourites' },
        { icon: 'calendar-outline', label: 'Booking history', href: '/bookings' },
      ]}
    />
  );
}
