import { ProfileScreen } from '@/components/ProfileScreen';

export default function ProviderAccount() {
  return (
    <ProfileScreen
      menu={[
        { icon: 'storefront-outline', label: 'Business profile', href: '/provider/business-form' },
        { icon: 'time-outline', label: 'Working hours', href: '/provider/hours' },
        { icon: 'construct-outline', label: 'My services', href: '/services' },
        { icon: 'person-outline', label: 'Edit personal details', href: '/edit-profile' },
      ]}
    />
  );
}
