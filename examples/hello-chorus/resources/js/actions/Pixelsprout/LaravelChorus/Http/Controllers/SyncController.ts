import { queryParams, type QueryParams } from './../../../../../wayfinder'
/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\SyncController::getInitialData
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/SyncController.php:16
* @route '/api/sync/{table}'
*/
export const getInitialData = (args: { table: string | number } | [table: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: getInitialData.url(args, options),
    method: 'get',
})

getInitialData.definition = {
    methods: ['get','head'],
    url: '/api/sync/{table}',
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\SyncController::getInitialData
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/SyncController.php:16
* @route '/api/sync/{table}'
*/
getInitialData.url = (args: { table: string | number } | [table: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
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

    return getInitialData.definition.url
            .replace('{table}', parsedArgs.table.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\SyncController::getInitialData
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/SyncController.php:16
* @route '/api/sync/{table}'
*/
getInitialData.get = (args: { table: string | number } | [table: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'get',
} => ({
    url: getInitialData.url(args, options),
    method: 'get',
})

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\SyncController::getInitialData
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/SyncController.php:16
* @route '/api/sync/{table}'
*/
getInitialData.head = (args: { table: string | number } | [table: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'head',
} => ({
    url: getInitialData.url(args, options),
    method: 'head',
})

const SyncController = { getInitialData }

export default SyncController