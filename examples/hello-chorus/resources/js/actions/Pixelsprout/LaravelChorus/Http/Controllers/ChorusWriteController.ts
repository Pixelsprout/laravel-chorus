import { queryParams, type QueryParams } from './../../../../../wayfinder'
/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::getActions
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:76
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
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:76
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
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:76
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
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:76
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
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:25
* @route '/api/write/{table}/{action}'
*/
export const handleAction = (args: { table: string | number, action: string | number } | [table: string | number, action: string | number ], options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: handleAction.url(args, options),
    method: 'post',
})

handleAction.definition = {
    methods: ['post'],
    url: '/api/write/{table}/{action}',
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:25
* @route '/api/write/{table}/{action}'
*/
handleAction.url = (args: { table: string | number, action: string | number } | [table: string | number, action: string | number ], options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
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

    return handleAction.definition.url
            .replace('{table}', parsedArgs.table.toString())
            .replace('{action}', parsedArgs.action.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::handleAction
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:25
* @route '/api/write/{table}/{action}'
*/
handleAction.post = (args: { table: string | number, action: string | number } | [table: string | number, action: string | number ], options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: handleAction.url(args, options),
    method: 'post',
})

const ChorusWriteController = { getActions, handleAction }

export default ChorusWriteController