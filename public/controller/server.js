import {createServer} from 'node:http'

const server = createServer(() => {
    Response.write('Hello WORLD')
    
    return Response.end()
})

server.listen(3333)