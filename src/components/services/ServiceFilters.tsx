import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SERVICE_CATEGORIES, type ServiceFilters, type ServiceCategory } from '@/hooks/useServices';
import { Search, X } from 'lucide-react';

interface ServiceFiltersProps {
  filters: ServiceFilters;
  onFiltersChange: (filters: ServiceFilters) => void;
  className?: string;
}

const DISTANCE_OPTIONS = [
  { value: '3blocks', label: '3 blocks' },
  { value: '0.5mi', label: '½ mile' },
  { value: '1mi', label: '1 mile' },
];

const TIME_OPTIONS = [
  { value: 'mornings', label: 'Mornings' },
  { value: 'afternoons', label: 'Afternoons' },
  { value: 'evenings', label: 'Evenings' },
  { value: 'weekends', label: 'Weekends' },
];

export function ServiceFilters({ filters, onFiltersChange, className }: ServiceFiltersProps) {
  const updateFilter = (key: keyof ServiceFilters, value: unknown) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key =>
    filters[key as keyof ServiceFilters] !== undefined &&
    filters[key as keyof ServiceFilters] !== ''
  );

  const getCategoryIcon = (category: ServiceCategory) => {
    switch (category) {
      case 'yardwork': return '🌱';
      case 'pets': return '🐕';
      case 'eldercare': return '👵';
      case 'errands': return '🏃';
      case 'oddjobs': return '🔧';
      default: return '❓';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category chips */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Categories</Label>
        <div className="flex flex-wrap gap-2">
          {SERVICE_CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={filters.category === category ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-accent"
              onClick={() => updateFilter('category',
                filters.category === category ? undefined : category
              )}
            >
              {getCategoryIcon(category)} {category}
            </Badge>
          ))}
        </div>
      </div>

      {/* Distance filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Distance</Label>
        <Select
          value={filters.distance || 'any'}
          onValueChange={(value) => updateFilter('distance', value === 'any' ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any distance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any distance</SelectItem>
            {DISTANCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time/Availability filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Time</Label>
        <Select
          value={filters.when || 'any'}
          onValueChange={(value) => updateFilter('when', value === 'any' ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any time</SelectItem>
            {TIME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Trusted only toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Trusted only</Label>
          <p className="text-xs text-muted-foreground">
            Show only users with badges or endorsements
          </p>
        </div>
        <Switch
          checked={filters.trusted || false}
          onCheckedChange={(checked) => updateFilter('trusted', checked || undefined)}
        />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Clear filters
        </Button>
      )}
    </div>
  );
}