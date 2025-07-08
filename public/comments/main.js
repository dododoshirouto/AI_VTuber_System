
const AUTH_TOKEN_JSON = "token.json";
const CURRENT_JSON = "../chara/current.json";

/*
 * $ID$
 * $ICON_URL$
 * $TIME_TEXT$
 * $NAME$
 * $MESSAGE$
*/
const COMMENT_HTML = `<yt-live-chat-text-message-renderer class="style-scope yt-live-chat-item-list-renderer" modern="" id="$ID$" whole-message-clickable="{&quot;commandMetadata&quot;:{&quot;webCommandMetadata&quot;:{&quot;ignoreNavigation&quot;:true}},&quot;liveChatItemContextMenuEndpoint&quot;:{&quot;params&quot;:&quot;Q2g0S0hBb2FRMUJRT1RaUFZFdHhXVFJFUmxoUVVIZG5VV1JIYTFWaE1YY2FLU29uQ2hoVlEzVXRlVkEyVjBwUk1IcGplRFZ1YlZkb2VIWktSV2NTQ3psWk0ySmhiSGQzVlZsUklBSW9CRElhQ2hoVlEybFJPVEExV21reVdXOTJTMGhLWkhONmJWZFdTM2M0QWtnQVVBRSUzRA==&quot;}}" author-type="">
    <yt-img-shadow id="author-photo" class="no-transition style-scope yt-live-chat-text-message-renderer" height="24" width="24" loaded="" style="background-color: transparent;">
        <img id="img" draggable="false" class="style-scope yt-img-shadow" alt="" height="24" width="24" src="$ICON_URL$">
    </yt-img-shadow>
    <div id="content" class="style-scope yt-live-chat-text-message-renderer">
    <span id="timestamp" class="style-scope yt-live-chat-text-message-renderer">$TIME_TEXT$</span>
    <yt-live-chat-author-chip class="style-scope yt-live-chat-text-message-renderer">
    <span id="prepend-chat-badges" class="style-scope yt-live-chat-author-chip">
    </span>
    <span id="author-name" dir="auto" class=" style-scope yt-live-chat-author-chip style-scope yt-live-chat-author-chip">
    $NAME$<span id="chip-badges" class="style-scope yt-live-chat-author-chip">
    </span>
    </span>
    <span id="chat-badges" class="style-scope yt-live-chat-author-chip">
    </span>
    </yt-live-chat-author-chip>
    ​<div id="before-content-buttons" class="style-scope yt-live-chat-text-message-renderer">
    </div>
    ​<span id="message" dir="auto" class="style-scope yt-live-chat-text-message-renderer">
    $MESSAGE$</span>
    <span id="deleted-state" class="style-scope yt-live-chat-text-message-renderer">
    </span>
    <a id="show-original" href="#" class="style-scope yt-live-chat-text-message-renderer">
    </a>
    </div>
    <div id="menu" class="style-scope yt-live-chat-text-message-renderer">
    <yt-icon-button id="menu-button" class="style-scope yt-live-chat-text-message-renderer">
    <button id="button" class="style-scope yt-icon-button" aria-label="チャットの操作">
    <yt-icon icon="more_vert" class="style-scope yt-live-chat-text-message-renderer">
    <span class="yt-icon-shape style-scope yt-icon yt-spec-icon-shape">
    <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
    <svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: inherit; width: 100%; height: 100%;">
    <path d="M12 16.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM10.5 12c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5zm0-6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5z">
    </path>
    </svg>
    </div>
    </span>
    </yt-icon>
    </button>
    <yt-interaction id="interaction" class="circular style-scope yt-icon-button">
    <div class="stroke style-scope yt-interaction">
    </div>
    <div class="fill style-scope yt-interaction">
    </div>
    </yt-interaction>
    </yt-icon-button>
    </div>
    <div id="inline-action-button-container" class="style-scope yt-live-chat-text-message-renderer" aria-hidden="true">
    <div id="inline-action-buttons" class="style-scope yt-live-chat-text-message-renderer">
    </div>
    </div>
</yt-live-chat-text-message-renderer>
`;
const COMMENTS_CONTAINER = document.getElementById("items");

async function create_comment_html(comment = { id: "test_id", time_text: "PM 12:34", icon_url: "test_icon_url", name: "test_name", message: "test_message" }) {
    if (document.getElementById(comment.id)) return;

    let html = format_comment_html(comment);
    let tmp = document.createElement("div");
    tmp.innerHTML = html;
    COMMENTS_CONTAINER.appendChild(tmp.firstElementChild);
}

function format_comment_html(comment = { id: "test_id", time_text: "PM 12:34", icon_url: "test_icon_url", name: "test_name", message: "test_message" }) {
    return COMMENT_HTML.replace('$ID$', comment.id)
        .replace('$ICON_URL$', comment.icon_url)
        .replace('$TIME_TEXT$', comment.time_text)
        .replace('$NAME$', comment.name)
        .replace('$MESSAGE$', comment.message);
}

/**
 * 
 * @returns {{"access_token":string,"refresh_token":string,"scope":string,"token_type":string,"expiry_date":number}}
 */
async function get_auth_token_from_json() {
    let res = await fetch(AUTH_TOKEN_JSON + '?' + Date.now());
    let json = await res.json();
    if (json?.expiry_date != token_data?.expiry_date)
        console.log(`Get Token: Expiry: ${new Date(json.expiry_date).toLocaleString()}`);
    return json;
}

async function get_current_json() {
    let res = await fetch(CURRENT_JSON + '?' + Date.now());
    let json = await res.json();
    return json;
}

/**
 * 
 * @returns {{"kind": "youtube#liveChatMessageListResponse","etag": etag,"nextPageToken": string,"pollingIntervalMillis": number,"offlineAt": datetime,"pageInfo": {"totalResults": number,"resultsPerPage": number},"items": [liveChatMessage],"activePollItem": liveChatMessage}}
 */
async function get_chat_messages({ liveChatId, pageToken } = {}) {
    let params = {
        liveChatId,
        part: 'id,snippet,authorDetails',
        // access_token: token_data.access_token,
    };
    let headers = { 'Authorization': `Bearer ${token_data.access_token}` };
    if (pageToken) params.pageToken = pageToken;
    let res;
    try {
        res = await fetch('https://www.googleapis.com/youtube/v3/liveChat/messages?' + new URLSearchParams(params), { headers });
    } catch (e) {
        console.error(e);
        return null;
    }
    if (!res || !res.ok) return null;

    let json = await res.json();
    return json;
}



var liveChatId = null;
var token_data = null;
async function init_loop() {
    while (true) {
        await new Promise(r => setTimeout(r, 500));

        token_data = await get_auth_token_from_json();

        let current = await get_current_json();
        if (current.liveChatId != liveChatId) {
            liveChatId = current.liveChatId;
            console.log(`Set liveChatId: ${liveChatId}`);
            COMMENTS_CONTAINER.innerHTML = '';
        }
    }
}
init_loop();



var nextPageToken = null;
async function main_loop() {
    while (true) {
        if (!liveChatId) {
            await new Promise(r => setTimeout(r, 500));
            continue;
        }

        let messages;
        try {
            messages = await get_chat_messages({ liveChatId, pageToken: nextPageToken });
        } catch (e) {
            console.error(e);
            await new Promise(r => setTimeout(r, 500));
            continue;
        }
        if (!messages) {
            await new Promise(r => setTimeout(r, 500));
            continue;
        }


        let comments = messages.items?.map(msg => {
            return {
                id: msg.id,
                time_text: new Date(msg.snippet.publishedAt).toLocaleTimeString(),
                icon_url: msg.authorDetails.profileImageUrl,
                name: msg.authorDetails.displayName,
                message: msg.snippet.displayMessage
            };
        });

        comments?.map(create_comment_html)?.join("\n") || '';

        await new Promise(r => setTimeout(r, 1));

        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });

        await new Promise(r => setTimeout(r, Math.max(messages.pollingIntervalMillis || 0, 500)));
    }
}
main_loop();




// for snippet
class liveChatMessage {
    "kind" = "youtube#liveChatMessage";
    "etag" = "etag";
    "id" = "string";
    "snippet" = {
        "type": "string",
        "liveChatId": "string",
        "authorChannelId": "string",
        "publishedAt": new Date(),
        "hasDisplayContent": false,
        "displayMessage": "string",
        "fanFundingEventDetails": {
            "amountMicros": 0,
            "currency": "string",
            "amountDisplayString": "string",
            "userComment": "string"
        },
        "textMessageDetails": {
            "messageText": "string"
        },
        "messageDeletedDetails": {
            "deletedMessageId": "string"
        },
        "userBannedDetails": {
            "bannedUserDetails": {
                "channelId": "string",
                "channelUrl": "string",
                "displayName": "string",
                "profileImageUrl": "string"
            },
            "banType": "string",
            "banDurationSeconds": 0
        },
        "memberMilestoneChatDetails": {
            "userComment": "string",
            "memberMonth": 0,
            "memberLevelName": "string"
        },
        "newSponsorDetails": {
            "memberLevelName": "string",
            "isUpgrade": false
        },
        "superChatDetails": {
            "amountMicros": 0,
            "currency": "string",
            "amountDisplayString": "string",
            "userComment": "string",
            "tier": 0
        },
        "superStickerDetails": {
            "superStickerMetadata": {
                "stickerId": "string",
                "altText": "string",
                "language": "string"
            },
            "amountMicros": 0,
            "currency": "string",
            "amountDisplayString": "string",
            "tier": 0
        },
        "pollDetails": {
            "metadata": {
                "options": {
                    "optionText": "string",
                    "tally": "string",
                },
                "questionText": "string",
                "status": "enum"
            },
        },
        "membershipGiftingDetails": {
            "giftMembershipsCount": 0,
            "giftMembershipsLevelName": "string"
        },
        "giftMembershipReceivedDetails": {
            "memberLevelName": "string",
            "gifterChannelId": "string",
            "associatedMembershipGiftingMessageId": "string"
        },
    };
    "authorDetails" = {
        "channelId": "string",
        "channelUrl": "string",
        "displayName": "string",
        "profileImageUrl": "string",
        "isVerified": false,
        "isChatOwner": false,
        "isChatSponsor": false,
        "isChatModerator": false
    };
}