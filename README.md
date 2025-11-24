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

## File Upload Feature (Chats)

        ### @api http://localhost:3000/api/v1/messages/upload
        ### @method POST (multipart/form-data)
        ### @accept fields:
        ###    - file (binary)
        ###    - receiverId OR roomId (one required)
        ###    - hideInTemp (optional boolean; defaults true)
        ### @return created message (may have hidden=true if temp session)

        Behavior:
            - Normal chats: Uploaded file appears instantly; images render inline; other files show a download button.
            - Temp sessions (roomId starts with temp_room_): Files are uploaded but marked hidden (not shown in chat) to preserve ephemeral privacy.
            - Cloudinary handles storage (resource_type=auto). Use environment vars CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.

        Client Usage (React Native):
            - Uses expo-document-picker to select a file.
            - Calls chatService.uploadFileMessage({ uri, name, mimeType, receiverId or roomId }).
            - Downloads with expo-file-system to app sandbox.

        Curl Test (replace TOKEN and RECEIVER_ID):
            curl -X POST \
                -H "Authorization: Bearer TOKEN" \
                -F "receiverId=RECEIVER_ID" \
                -F "file=@/path/to/local/file.txt" \
                http://localhost:8000/api/v1/messages/upload

## Temp Session Notes

        - Endpoint set: /api/v1/temp/session (create), /join, /:id/messages, /:id/end
        - Messages flagged ephemeral and destroyed when session ends.
        - Media uploads intentionally hidden; text only visible.
        - QR code & code entry supported on client; scanner optional.

## Environment Variables (Server .env excerpt)

        CLOUDINARY_CLOUD_NAME=your_cloud_name
        CLOUDINARY_API_KEY=your_api_key
        CLOUDINARY_API_SECRET=your_api_secret
        ACCESS_TOKEN_SECRET=your_super_secret_jwt_key_here
