import { queryParams, type QueryParams } from './../../wayfinder'
/**
* @see \App\Actions\CreateMessage::create
* @see app/Actions/CreateMessage.php:17
* @route '/messages'
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
    url: '/messages',
}

/**
* @see \App\Actions\CreateMessage::create
* @see app/Actions/CreateMessage.php:17
* @route '/messages'
*/
create.url = (options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
    return create.definition.url + queryParams(options)
}

/**
* @see \App\Actions\CreateMessage::create
* @see app/Actions/CreateMessage.php:17
* @route '/messages'
*/
create.post = (options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'post',
} => ({
    url: create.url(options),
    method: 'post',
})

/**
* @see \App\Actions\UpdateMessage::update
* @see app/Actions/UpdateMessage.php:17
* @route '/messages/{messageId}'
*/
export const update = (args: { messageId: string | number } | [messageId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'put',
} => ({
    url: update.url(args, options),
    method: 'put',
})

update.definition = {
    methods: ['put'],
    url: '/messages/{messageId}',
}

/**
* @see \App\Actions\UpdateMessage::update
* @see app/Actions/UpdateMessage.php:17
* @route '/messages/{messageId}'
*/
update.url = (args: { messageId: string | number } | [messageId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
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

    return update.definition.url
            .replace('{messageId}', parsedArgs.messageId.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Actions\UpdateMessage::update
* @see app/Actions/UpdateMessage.php:17
* @route '/messages/{messageId}'
*/
update.put = (args: { messageId: string | number } | [messageId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'put',
} => ({
    url: update.url(args, options),
    method: 'put',
})

/**
* @see \App\Actions\DeleteMessage::destroy
* @see app/Actions/DeleteMessage.php:17
* @route '/messages/{messageId}'
*/
export const destroy = (args: { messageId: string | number } | [messageId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'delete',
} => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ['delete'],
    url: '/messages/{messageId}',
}

/**
* @see \App\Actions\DeleteMessage::destroy
* @see app/Actions/DeleteMessage.php:17
* @route '/messages/{messageId}'
*/
destroy.url = (args: { messageId: string | number } | [messageId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }) => {
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

    return destroy.definition.url
            .replace('{messageId}', parsedArgs.messageId.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Actions\DeleteMessage::destroy
* @see app/Actions/DeleteMessage.php:17
* @route '/messages/{messageId}'
*/
destroy.delete = (args: { messageId: string | number } | [messageId: string | number ] | string | number, options?: { query?: QueryParams, mergeQuery?: QueryParams }): {
    url: string,
    method: 'delete',
} => ({
    url: destroy.url(args, options),
    method: 'delete',
})

const messages = {
    create,
    update,
    destroy,
}

export default messages