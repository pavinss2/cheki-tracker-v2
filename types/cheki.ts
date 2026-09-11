export interface Transaction {
  id: string;
  userId: string;
  member: string;
  color: string;
  group: string;
  nationality: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  year: string; // YYYY
  event: string;
  description: string;
  type: string;
  location: string;
  quantity: number;
  totalPrice: number;
  img: string;
  talkTopic: string;
  company: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DimMember {
  id: string;
  userId: string;
  member_name: string;
  member_image: string;
  color: string;
  group: string;
  country: string;
  company: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  x_profile?: string;
  date_added?: string;
  date_modified?: string;
  createdAt?: string;
  updatedAt?: string;
  is_default?: boolean;
  isDefault?: boolean;
  is_imported?: boolean;
  is_allowed_import?: boolean;
  allow_import?: boolean;
}

export interface DimGroup {
  id: string;
  userId: string;
  group: string;
  country: string;
  company: string;
  is_active?: boolean;
  is_default?: boolean;
  isDefault?: boolean;
  is_imported?: boolean;
  is_allowed_import?: boolean;
  allow_import?: boolean;
  date_added?: string;
  date_modified?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DimCompany {
  id: string;
  userId: string;
  company: string;
  is_active?: boolean;
  is_default?: boolean;
  isDefault?: boolean;
  is_imported?: boolean;
  is_allowed_import?: boolean;
  allow_import?: boolean;
  date_added?: string;
  date_modified?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DimColor {
  id: string;
  userId: string;
  color: string;
  color_code: string;
  is_active?: boolean;
  is_default?: boolean;
  isDefault?: boolean;
  is_allowed_import?: boolean;
  allow_import?: boolean;
  date_added?: string;
  date_modified?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DimType {
  id: string;
  userId: string;
  type: string;
  is_active?: boolean;
  is_default?: boolean;
  isDefault?: boolean;
  is_allowed_import?: boolean;
  allow_import?: boolean;
  date_added?: string;
  date_modified?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DimCountry {
  id: string;
  userId: string;
  country: string;
  displayed_country: string;
  is_active?: boolean;
  is_default?: boolean;
  isDefault?: boolean;
  is_allowed_import?: boolean;
  allow_import?: boolean;
  date_added?: string;
  date_modified?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DimLocation {
  id: string;
  userId: string;
  location: string;
  is_active?: boolean;
  is_default?: boolean;
  isDefault?: boolean;
  is_allowed_import?: boolean;
  allow_import?: boolean;
  date_added?: string;
  date_modified?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceRuleCondition {
  field: 'type' | 'country' | 'group' | 'location' | 'member' | 'company';
  operator: 'equals' | 'contains';
  value: string;
}

export interface PriceRule {
  id: string;
  name: string;
  conditions: PriceRuleCondition[];
  price: number;
  priority: number;
  enabled: boolean;
}

export interface AdminLog {
  id: string;
  userId: string;
  actionType: string;
  actionDetail: string;
  timestamp: string;
}

export interface FilterState {
  year: string;
  group: string;
  color: string;
  member: string;
  nationality: string;
  company: string;
  type: string;
  location: string;
  activeCellFilters: Record<string, string>;
}
