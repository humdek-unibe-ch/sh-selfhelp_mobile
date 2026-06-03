/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Add a new API request

Audience: Developers extending the system.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-06-03.
Source of truth: Runtime code and the established patterns it follows.

The mobile app talks to the Symfony backend exclusively through `/cms-api/v1/*`. Adding a new request usually involves three small edits.

## 1. Endpoint constant in shared

Edit `sh-selfhelp_shared/src/api/endpoints.ts` and add the path. Keep endpoints frontend-facing only — admin endpoints stay private to the web frontend.

```ts
NOTIFICATIONS: {
    LIST: `${API_VERSION_PREFIX}/notifications`,
    READ: (id: number) => `${API_VERSION_PREFIX}/notifications/${id}/read`,
},
```

## 2. Request / response DTOs in shared

Add to `sh-selfhelp_shared/src/types/api/notifications.ts` (new file if needed):

```ts
import type { IBaseApiResponse } from './envelope';

export interface INotificationItem {
    id: number;
    body: string;
    is_read: boolean;
    created_at: string;
}

export type INotificationsListResponse = IBaseApiResponse<INotificationItem[]>;
```

Re-export from `src/types/api/index.ts`. Build the shared package.

## 3. Service wrapper in mobile

`sh-selfhelp_mobile/services/notificationsService.ts`:

```ts
import { ENDPOINTS, type INotificationsListResponse } from '@selfhelp/shared';
import { getApiClient } from '@/services/apiClient';

export async function fetchNotifications() {
    const resp = await getApiClient().get<INotificationsListResponse>(ENDPOINTS.NOTIFICATIONS.LIST);
    return resp.data.data ?? [];
}
```

## 4. (Optional) React Query hook

`hooks/useNotifications.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchNotifications } from '@/services/notificationsService';

export function useNotifications() {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: fetchNotifications,
        staleTime: 30_000,
    });
}
```

## Things the API client handles for you

- `Authorization: Bearer ...` header — pulled from `useAuthStore`.
- `X-Client-Type: mobile` — backend uses this for page filtering.
- `Accept-Language` — set from the active locale.
- 401 → silent refresh + retry.
- baseURL — wired from `useServerStore`.

Don't reach into `axios` directly; always go through `getApiClient()`.
