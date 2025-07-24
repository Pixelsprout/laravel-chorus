import { queryParams, type QueryParams } from './../../../../../wayfinder'
/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::getActions
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:204
* @route '/api/actions/{table}'
*/
export const getActions = (args: { table: string | number } | [table: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: getActions.url(args, options),
    method: 'get',
})

getActions.definition = {
    methods: ['get','head'],
    url: '/api/actions/{table}',
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::getActions
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:204
* @route '/api/actions/{table}'
*/
getActions.url = (args: { table: string | number } | [table: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { table: args }
    }

    if (Array.isArray(args)) {
        args = {
            table: args[0],
        }
    }

    const parsedArgs = {
        table: args.table,
    }

    return getActions.definition.url
            .replace('{table}', parsedArgs.table.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::getActions
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:204
* @route '/api/actions/{table}'
*/
getActions.get = (args: { table: string | number } | [table: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: getActions.url(args, options),
    method: 'get',
})

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::getActions
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:204
* @route '/api/actions/{table}'
*/
getActions.head = (args: { table: string | number } | [table: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: getActions.url(args, options),
    method: 'head',
})

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/write/{table}/{action}'
*/
const handleAction7fc1cac8b58214e489024827a2037df3 = (args: { table: string | number, action: string | number } | [table: string | number, action: string | number ], options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: handleAction7fc1cac8b58214e489024827a2037df3.url(args, options),
    method: 'post',
})

handleAction7fc1cac8b58214e489024827a2037df3.definition = {
    methods: ['post'],
    url: '/api/write/{table}/{action}',
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/write/{table}/{action}'
*/
handleAction7fc1cac8b58214e489024827a2037df3.url = (args: { table: string | number, action: string | number } | [table: string | number, action: string | number ], options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    if (Array.isArray(args)) {
        args = {
            table: args[0],
            action: args[1],
        }
    }

    const parsedArgs = {
        table: args.table,
        action: args.action,
    }

    return handleAction7fc1cac8b58214e489024827a2037df3.definition.url
            .replace('{table}', parsedArgs.table.toString())
            .replace('{action}', parsedArgs.action.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/write/{table}/{action}'
*/
handleAction7fc1cac8b58214e489024827a2037df3.post = (args: { table: string | number, action: string | number } | [table: string | number, action: string | number ], options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: handleAction7fc1cac8b58214e489024827a2037df3.url(args, options),
    method: 'post',
})

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/create'
*/
const handleAction192658bf3759fb50dab209cd9cd5ef73 = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: handleAction192658bf3759fb50dab209cd9cd5ef73.url(options),
    method: 'post',
})

handleAction192658bf3759fb50dab209cd9cd5ef73.definition = {
    methods: ['post'],
    url: '/api/chorus/messages/create',
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/create'
*/
handleAction192658bf3759fb50dab209cd9cd5ef73.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return handleAction192658bf3759fb50dab209cd9cd5ef73.definition.url + queryParams(options)
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/create'
*/
handleAction192658bf3759fb50dab209cd9cd5ef73.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: handleAction192658bf3759fb50dab209cd9cd5ef73.url(options),
    method: 'post',
})

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/update'
*/
const handleActionb10423843c061d139be7b67a21b48fdd = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: handleActionb10423843c061d139be7b67a21b48fdd.url(options),
    method: 'post',
})

handleActionb10423843c061d139be7b67a21b48fdd.definition = {
    methods: ['post'],
    url: '/api/chorus/messages/update',
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/update'
*/
handleActionb10423843c061d139be7b67a21b48fdd.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return handleActionb10423843c061d139be7b67a21b48fdd.definition.url + queryParams(options)
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/update'
*/
handleActionb10423843c061d139be7b67a21b48fdd.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: handleActionb10423843c061d139be7b67a21b48fdd.url(options),
    method: 'post',
})

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/delete'
*/
const handleAction64842abe8a2d33c10b519b6157010a0e = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: handleAction64842abe8a2d33c10b519b6157010a0e.url(options),
    method: 'post',
})

handleAction64842abe8a2d33c10b519b6157010a0e.definition = {
    methods: ['post'],
    url: '/api/chorus/messages/delete',
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/delete'
*/
handleAction64842abe8a2d33c10b519b6157010a0e.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return handleAction64842abe8a2d33c10b519b6157010a0e.definition.url + queryParams(options)
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/delete'
*/
handleAction64842abe8a2d33c10b519b6157010a0e.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: handleAction64842abe8a2d33c10b519b6157010a0e.url(options),
    method: 'post',
})

export const handleAction = {
    '/api/write/{table}/{action}': handleAction7fc1cac8b58214e489024827a2037df3,
    '/api/chorus/messages/create': handleAction192658bf3759fb50dab209cd9cd5ef73,
    '/api/chorus/messages/update': handleActionb10423843c061d139be7b67a21b48fdd,
    '/api/chorus/messages/delete': handleAction64842abe8a2d33c10b519b6157010a0e,
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleBatch
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:0
* @route '/api/chorus/messages/batch'
*/
export const handleBatch = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: handleBatch.url(options),
    method: 'post',
})

handleBatch.definition = {
    methods: ['post'],
    url: '/api/chorus/messages/batch',
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleBatch
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:0
* @route '/api/chorus/messages/batch'
*/
handleBatch.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return handleBatch.definition.url + queryParams(options)
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleBatch
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:0
* @route '/api/chorus/messages/batch'
*/
handleBatch.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: handleBatch.url(options),
    method: 'post',
})

const ChorusWriteController = { getActions, handleAction, handleBatch }

export default ChorusWriteController