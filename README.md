# Authentication

    ### @api http://localhost:3000/api/v1/auth/send-otp     ✅
    ### @method POST
    ### @accept phoneNumber in body
    ### @return otp sent to user phone number



    ### @api http://localhost:3000/api/v1/auth/authentication    ✅
    ### @method POST
    ### @accept phoneNumber and otp in body
    ### @return user data and access token

# User

    ### @api http://localhost:3000/api/v1/users/:id    ✅
    ### @method GET
    ### @accept userId from path params and auth token from headers
    ### @return user profile data


    ### @api /users/me    ✅
    ### @method GET
    ### @accept auth token from headers
    ### @return user current profile data



    ### @api http://localhost:3000/api/v1/users/updateUserProfile    ✅
    ### @method PATCH
    ### @accept auth token from headers
    ### @accept body: {description}
    ### @return updated user profile data



    ### @api http://localhost:3000/api/v1/users/:id/primaryChat
    ### @method GET
    ### @accept userId from path params and auth token from headers
    ### @return list of primary chats (sent by user)



    ### @api http://localhost:3000/api/v1/users/:id/secondaryChat
    ### @method GET
    ### @accept userId from path params and auth token from headers
    ### @return list of secondary chats (received or pending)



    ### @api http://localhost:3000/api/v1/users/:id/chat/:chatId
    ### @method PATCH
    ### @accept userId and chatId from path params, auth token from headers
    ### @accept body: {primaryChat, secondaryChat}
    ### @return updated user chat info

# Messages

    ### @api http://localhost:3000/api/v1/messages/search
    ### @method GET
    ### @accept query param: U_Id, auth token from headers
    ### @return user info if found



    ### @api http://localhost:3000/api/v1/messages/all
    ### @method GET
    ### @accept auth token from headers
    ### @return list of all chats (primary + secondary)



    ### @api http://localhost:3000/api/v1/messages/:userId/messages
    ### @method GET
    ### @accept userId from path params, auth token from headers
    ### @return list of messages with specific user
