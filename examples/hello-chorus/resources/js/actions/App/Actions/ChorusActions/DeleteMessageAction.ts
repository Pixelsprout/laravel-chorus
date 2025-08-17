import { queryParams, type QueryParams } from './../../../../wayfinder'
/**
* @see \App\Actions\ChorusActions\DeleteMessageAction::__invoke
* @see app/Actions/ChorusActions/DeleteMessageAction.php:20
* @route '/api/actions/delete-message'
*/
const DeleteMessageAction = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: DeleteMessageAction.url(options),
    method: 'post',
})

DeleteMessageAction.definition = {
    methods: ['post'],
    url: '/api/actions/delete-message',
}

/**
* @see \App\Actions\ChorusActions\DeleteMessageAction::__invoke
* @see app/Actions/ChorusActions/DeleteMessageAction.php:20
* @route '/api/actions/delete-message'
*/
DeleteMessageAction.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return DeleteMessageAction.definition.url + queryParams(options)
}

/**
* @see \App\Actions\ChorusActions\DeleteMessageAction::__invoke
* @see app/Actions/ChorusActions/DeleteMessageAction.php:20
* @route '/api/actions/delete-message'
*/
DeleteMessageAction.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: DeleteMessageAction.url(options),
    method: 'post',
})

export default DeleteMessageAction