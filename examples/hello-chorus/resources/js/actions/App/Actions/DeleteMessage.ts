import { queryParams, type QueryParams } from './../../../wayfinder'
/**
* @see \App\Actions\DeleteMessage::__invoke
* @see app/Actions/DeleteMessage.php:17
* @route '/messages/{messageId}'
*/
const DeleteMessage = (args: { messageId: string | number } | [messageId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'delete',
} => ({
    url: DeleteMessage.url(args, options),
    method: 'delete',
})

DeleteMessage.definition = {
    methods: ['delete'],
    url: '/messages/{messageId}',
}

/**
* @see \App\Actions\DeleteMessage::__invoke
* @see app/Actions/DeleteMessage.php:17
* @route '/messages/{messageId}'
*/
DeleteMessage.url = (args: { messageId: string | number } | [messageId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
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

    return DeleteMessage.definition.url
            .replace('{messageId}', parsedArgs.messageId.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Actions\DeleteMessage::__invoke
* @see app/Actions/DeleteMessage.php:17
* @route '/messages/{messageId}'
*/
DeleteMessage.delete = (args: { messageId: string | number } | [messageId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'delete',
} => ({
    url: DeleteMessage.url(args, options),
    method: 'delete',
})

export default DeleteMessage