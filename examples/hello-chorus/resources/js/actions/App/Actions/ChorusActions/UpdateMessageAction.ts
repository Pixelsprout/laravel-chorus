import { queryParams, type QueryParams } from './../../../../wayfinder'
/**
* @see \App\Actions\ChorusActions\UpdateMessageAction::__invoke
* @see app/Actions/ChorusActions/UpdateMessageAction.php:18
* @route '/api/actions/update-message'
*/
const UpdateMessageAction = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: UpdateMessageAction.url(options),
    method: 'post',
})

UpdateMessageAction.definition = {
    methods: ['post'],
    url: '/api/actions/update-message',
}

/**
* @see \App\Actions\ChorusActions\UpdateMessageAction::__invoke
* @see app/Actions/ChorusActions/UpdateMessageAction.php:18
* @route '/api/actions/update-message'
*/
UpdateMessageAction.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return UpdateMessageAction.definition.url + queryParams(options)
}

/**
* @see \App\Actions\ChorusActions\UpdateMessageAction::__invoke
* @see app/Actions/ChorusActions/UpdateMessageAction.php:18
* @route '/api/actions/update-message'
*/
UpdateMessageAction.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: UpdateMessageAction.url(options),
    method: 'post',
})

export default UpdateMessageAction