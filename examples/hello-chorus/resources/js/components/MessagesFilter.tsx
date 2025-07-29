import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Platform } from '@/_generated/types';

interface MessagesFilterProps {
    platforms: Platform[] | undefined;
    platformsLoading: boolean;
    platformsError: string | null;
    selectedPlatform: string | null;
    onPlatformChange: (platformId: string | null) => void;
}

export default function MessagesFilter({
    platforms,
    platformsLoading,
    platformsError,
    selectedPlatform,
    onPlatformChange
}: MessagesFilterProps) {
    return (
        <div className="mb-4 flex justify-end">
            <div className="w-full max-w-xs">
                <Label htmlFor="platform-filter">Filter by Platform</Label>
                <Select
                    value={selectedPlatform || 'all'}
                    onValueChange={(value) => onPlatformChange(value === 'all' ? null : value)}
                    disabled={platformsLoading}
                >
                    <SelectTrigger id="platform-filter">
                        <SelectValue placeholder="Filter by platform" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Platforms</SelectItem>
                        {platformsError ? (
                            <SelectItem value="error" disabled>
                                Error loading platforms
                            </SelectItem>
                        ) : platforms?.length ? (
                            platforms.map((platform) => (
                                <SelectItem key={platform.id} value={platform.id}>
                                    {platform.name}
                                </SelectItem>
                            ))
                        ) : (
                            <SelectItem value="none" disabled>
                                No platforms available
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
