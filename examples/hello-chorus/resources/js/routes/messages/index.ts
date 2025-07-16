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

const messages = {
    create,
}

export default messages