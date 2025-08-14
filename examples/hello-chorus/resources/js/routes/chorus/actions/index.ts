import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Actions\ChorusActions\CreateMessageWithActivityAction::createMessageWithActivity
* @see app/Actions/ChorusActions/CreateMessageWithActivityAction.php:20
* @route '/api/actions/create-message-with-activity'
*/
export const createMessageWithActivity = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: createMessageWithActivity.url(options),
    method: 'post',
})

createMessageWithActivity.definition = {
    methods: ['post'],
    url: '/api/actions/create-message-with-activity',
}

/**
* @see \App\Actions\ChorusActions\CreateMessageWithActivityAction::createMessageWithActivity
* @see app/Actions/ChorusActions/CreateMessageWithActivityAction.php:20
* @route '/api/actions/create-message-with-activity'
*/
createMessageWithActivity.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return createMessageWithActivity.definition.url + queryParams(options)
}

/**
* @see \App\Actions\ChorusActions\CreateMessageWithActivityAction::createMessageWithActivity
* @see app/Actions/ChorusActions/CreateMessageWithActivityAction.php:20
* @route '/api/actions/create-message-with-activity'
*/
createMessageWithActivity.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: createMessageWithActivity.url(options),
    method: 'post',
})

/**
* @see \App\Actions\ChorusActions\UpdateMessageAction::updateMessage
* @see app/Actions/ChorusActions/UpdateMessageAction.php:20
* @route '/api/actions/update-message'
*/
export const updateMessage = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: updateMessage.url(options),
    method: 'post',
})

updateMessage.definition = {
    methods: ['post'],
    url: '/api/actions/update-message',
}

/**
* @see \App\Actions\ChorusActions\UpdateMessageAction::updateMessage
* @see app/Actions/ChorusActions/UpdateMessageAction.php:20
* @route '/api/actions/update-message'
*/
updateMessage.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return updateMessage.definition.url + queryParams(options)
}

/**
* @see \App\Actions\ChorusActions\UpdateMessageAction::updateMessage
* @see app/Actions/ChorusActions/UpdateMessageAction.php:20
* @route '/api/actions/update-message'
*/
updateMessage.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: updateMessage.url(options),
    method: 'post',
})

/**
* @see \App\Actions\ChorusActions\DeleteMessageAction::deleteMessage
* @see app/Actions/ChorusActions/DeleteMessageAction.php:20
* @route '/api/actions/delete-message'
*/
export const deleteMessage = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: deleteMessage.url(options),
    method: 'post',
})

deleteMessage.definition = {
    methods: ['post'],
    url: '/api/actions/delete-message',
}

/**
* @see \App\Actions\ChorusActions\DeleteMessageAction::deleteMessage
* @see app/Actions/ChorusActions/DeleteMessageAction.php:20
* @route '/api/actions/delete-message'
*/
deleteMessage.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return deleteMessage.definition.url + queryParams(options)
}

/**
* @see \App\Actions\ChorusActions\DeleteMessageAction::deleteMessage
* @see app/Actions/ChorusActions/DeleteMessageAction.php:20
* @route '/api/actions/delete-message'
*/
deleteMessage.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: deleteMessage.url(options),
    method: 'post',
})

const actions = {
    createMessageWithActivity,
    updateMessage,
    deleteMessage,
}

export default actions