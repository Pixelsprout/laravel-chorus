import { queryParams, type QueryParams } from '@/wayfinder'
/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::create
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/create'
*/
export const create = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: create.url(options),
    method: 'post',
})

create.definition = {
    methods: ['post'],
    url: '/api/chorus/messages/create',
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::create
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/create'
*/
create.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return create.definition.url + queryParams(options)
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::create
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/create'
*/
create.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: create.url(options),
    method: 'post',
})

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::update
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/update'
*/
export const update = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: update.url(options),
    method: 'post',
})

update.definition = {
    methods: ['post'],
    url: '/api/chorus/messages/update',
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::update
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/update'
*/
update.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return update.definition.url + queryParams(options)
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::update
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/update'
*/
update.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: update.url(options),
    method: 'post',
})

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::deleteMethod
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/delete'
*/
export const deleteMethod = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: deleteMethod.url(options),
    method: 'post',
})

deleteMethod.definition = {
    methods: ['post'],
    url: '/api/chorus/messages/delete',
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::deleteMethod
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/delete'
*/
deleteMethod.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return deleteMethod.definition.url + queryParams(options)
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::deleteMethod
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:21
* @route '/api/chorus/messages/delete'
*/
deleteMethod.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: deleteMethod.url(options),
    method: 'post',
})

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::batch
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:0
* @route '/api/chorus/messages/batch'
*/
export const batch = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: batch.url(options),
    method: 'post',
})

batch.definition = {
    methods: ['post'],
    url: '/api/chorus/messages/batch',
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::batch
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:0
* @route '/api/chorus/messages/batch'
*/
batch.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return batch.definition.url + queryParams(options)
}

/**
* @see \Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController::batch
* @see Users/braeden.foster/workshop/laravel-chorus/packages/chorus/src/Http/Controllers/ChorusWriteController.php:0
* @route '/api/chorus/messages/batch'
*/
batch.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: batch.url(options),
    method: 'post',
})

const messages = {
    create,
    update,
    delete: deleteMethod,
    batch,
}

export default messages
