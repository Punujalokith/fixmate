import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, TextInput, View } from 'react-native';
import { ServiceCard } from '@/components/cards';
import { Chip, EmptyState, ErrorView, Row } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useCategories } from '@/lib/queries';
import type { Paginated, Service } from '@/lib/types';
import { colors, font, radius, spacing } from '@/theme';

const CITIES = ['Colombo', 'Kandy', 'Galle', 'Negombo'];
const SORTS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'price_desc', label: 'Highest price' },
] as const;

function useDebounced<T>(value: T, ms = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function Search() {
  const params = useLocalSearchParams<{ category?: string; q?: string }>();
  const categories = useCategories();
  const [q, setQ] = useState(params.q ?? '');
  const [category, setCategory] = useState(params.category ?? '');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('relevance');
  const query = useDebounced(q.trim());

  const results = useInfiniteQuery({
    queryKey: ['services', { query, category, city, sort }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams({ page: String(pageParam), limit: '15', sort });
      if (query) search.set('q', query);
      if (category) search.set('category', category);
      if (city) search.set('city', city);
      return api<Paginated<Service>>(`/services?${search}`, { auth: false });
    },
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
  const items = results.data?.pages.flatMap((p) => p.data) ?? [];
  const total = results.data?.pages[0]?.meta.total ?? 0;

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <Row style={{ backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md }}>
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <TextInput value={q} onChangeText={setQ} placeholder="What do you need fixed?" placeholderTextColor={colors.textFaint} style={{ flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text }} autoFocus={!params.category} returnKeyType="search" />
        {q ? <Ionicons name="close-circle" size={18} color={colors.textFaint} onPress={() => setQ('')} /> : null}
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        <Chip label="All services" selected={!category} onPress={() => setCategory('')} />
        {categories.data?.map((c) => (
          <Chip key={c.id} label={c.name} selected={category === c.slug} onPress={() => setCategory(category === c.slug ? '' : c.slug)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        <Chip label="Anywhere" icon="location-outline" selected={!city} onPress={() => setCity('')} />
        {CITIES.map((c) => (
          <Chip key={c} label={c} selected={city === c} onPress={() => setCity(city === c ? '' : c)} />
        ))}
      </ScrollView>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={font.small}>{results.isLoading ? 'Searching…' : `${total} service${total === 1 ? '' : 's'}`}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0, maxWidth: '70%' }}>
          {SORTS.map((s) => (
            <Chip key={s.value} label={s.label} selected={sort === s.value} onPress={() => setSort(s.value)} />
          ))}
        </ScrollView>
      </Row>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg }}
      data={items}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => <ServiceCard service={item} />}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      onEndReachedThreshold={0.4}
      onEndReached={() => results.hasNextPage && !results.isFetchingNextPage && results.fetchNextPage()}
      ListFooterComponent={results.isFetchingNextPage || results.isLoading ? <ActivityIndicator color={colors.primary} style={{ margin: spacing.xl }} /> : null}
      ListEmptyComponent={
        results.isLoading ? null : results.error ? (
          <ErrorView message={errorMessage(results.error)} onRetry={results.refetch} />
        ) : (
          <EmptyState icon="search-outline" title="No services found" message="Try another category, city or search word." />
        )
      }
    />
  );
}
