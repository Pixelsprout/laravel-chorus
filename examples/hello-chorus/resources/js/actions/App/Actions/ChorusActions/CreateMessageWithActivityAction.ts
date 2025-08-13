import { queryParams, type QueryParams } from './../../../../wayfinder'
/**
* @see \App\Actions\ChorusActions\CreateMessageWithActivityAction::__invoke
* @see app/Actions/ChorusActions/CreateMessageWithActivityAction.php:27
* @route '/api/actions/create-message-with-activity'
*/
const CreateMessageWithActivityAction = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: CreateMessageWithActivityAction.url(options),
    method: 'post',
})

CreateMessageWithActivityAction.definition = {
    methods: ['post'],
    url: '/api/actions/create-message-with-activity',
}

/**
* @see \App\Actions\ChorusActions\CreateMessageWithActivityAction::__invoke
* @see app/Actions/ChorusActions/CreateMessageWithActivityAction.php:27
* @route '/api/actions/create-message-with-activity'
*/
CreateMessageWithActivityAction.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return CreateMessageWithActivityAction.definition.url + queryParams(options)
}

/**
* @see \App\Actions\ChorusActions\CreateMessageWithActivityAction::__invoke
* @see app/Actions/ChorusActions/CreateMessageWithActivityAction.php:27
* @route '/api/actions/create-message-with-activity'
*/
CreateMessageWithActivityAction.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: CreateMessageWithActivityAction.url(options),
    method: 'post',
})

export default CreateMessageWithActivityAction