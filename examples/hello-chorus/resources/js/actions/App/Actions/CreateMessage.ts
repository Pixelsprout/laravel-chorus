import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Actions\CreateMessage::__invoke
* @see app/Actions/CreateMessage.php:17
* @route '/messages'
*/
const CreateMessage = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: CreateMessage.url(options),
    method: 'post',
})

CreateMessage.definition = {
    methods: ['post'],
    url: '/messages',
}

/**
* @see \App\Actions\CreateMessage::__invoke
* @see app/Actions/CreateMessage.php:17
* @route '/messages'
*/
CreateMessage.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return CreateMessage.definition.url + queryParams(options)
}

/**
* @see \App\Actions\CreateMessage::__invoke
* @see app/Actions/CreateMessage.php:17
* @route '/messages'
*/
CreateMessage.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: CreateMessage.url(options),
    method: 'post',
})

export default CreateMessage