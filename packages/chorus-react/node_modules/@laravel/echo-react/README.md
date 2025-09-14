# Laravel Echo React Helpers

## `configureEcho`

You must call this function somewhere in your app _before_ you use `useEcho` in a component to configure your Echo instance. You only need to pass the required data:

```ts
import { configureEcho } from "@laravel/echo-react";

configureEcho({
    broadcaster: "reverb",
});
```

Based on your brodcaster, the package will fill in appropriate defaults for the rest of the config [based on the Echo documentation](https://laravel.com/docs/broadcasting#client-side-installation). You can always override these values by simply passing in your own.

In the above example, the configuration would also fill in the following keys if they aren't present:

```ts
{
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    wssPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
}
```

## `useEcho` Hook

Connect to private channel:

```ts
import { useEcho } from "@laravel/echo-react";

const { leaveChannel, leave, stopListening, listen } = useEcho(
    `orders.${orderId}`,
    "OrderShipmentStatusUpdated",
    (e) => {
        console.log(e.order);
    },
);

// Stop listening without leaving channel
stopListening();

// Start listening again
listen();

// Leave channel
leaveChannel();

// Leave a channel and also its associated private and presence channels
leave();
```

Multiple events:

```ts
useEcho(
    `orders.${orderId}`,
    ["OrderShipmentStatusUpdated", "OrderShipped"],
    (e) => {
        console.log(e.order);
    },
);
```

Specify shape of payload data:

```ts
type OrderData = {
    order: {
        id: number;
        user: {
            id: number;
            name: string;
        };
        created_at: string;
    };
};

useEcho<OrderData>(`orders.${orderId}`, "OrderShipmentStatusUpdated", (e) => {
    console.log(e.order.id);
    console.log(e.order.user.id);
});
```

Connect to public channel:

```ts
useEchoPublic("posts", "PostPublished", (e) => {
    console.log(e.post);
});
```

Connect to presence channel:

```ts
useEchoPresence("posts", "PostPublished", (e) => {
    console.log(e.post);
});
```

Listening for model events:

```ts
useEchoModel("App.Models.User", userId, ["UserCreated", "UserUpdated"], (e) => {
    console.log(e.model);
});
```
