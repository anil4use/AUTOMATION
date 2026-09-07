export interface UserDomainModel {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: 'admin' | 'member' | 'owner';
  createdAt: Date;
}

export interface OrganizationDomainModel {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
}
