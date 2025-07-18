import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Actions\UpdateMessage::__invoke
* @see app/Actions/UpdateMessage.php:17
* @route '/messages/{messageId}'
*/
const UpdateMessage = (args: { messageId: string | number } | [messageId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'put',
} => ({
    url: UpdateMessage.url(args, options),
    method: 'put',
})

UpdateMessage.definition = {
    methods: ['put'],
    url: '/messages/{messageId}',
}

/**
* @see \App\Actions\UpdateMessage::__invoke
* @see app/Actions/UpdateMessage.php:17
* @route '/messages/{messageId}'
*/
UpdateMessage.url = (args: { messageId: string | number } | [messageId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { messageId: args }
    }

    if (Array.isArray(args)) {
        args = {
            messageId: args[0],
        }
    }

    const parsedArgs = {
        messageId: args.messageId,
    }

    return UpdateMessage.definition.url
            .replace('{messageId}', parsedArgs.messageId.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Actions\UpdateMessage::__invoke
* @see app/Actions/UpdateMessage.php:17
* @route '/messages/{messageId}'
*/
UpdateMessage.put = (args: { messageId: string | number } | [messageId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'put',
} => ({
    url: UpdateMessage.url(args, options),
    method: 'put',
})

export default UpdateMessage