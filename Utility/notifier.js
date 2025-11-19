// Utility/notifier.js
// Right now: just logs.
// Later: you can plug in Redis publish() or WebSocket broadcast here.

async function restaurantProfileUpdated(restaurantId, data) {
    console.log("Restaurant profile updated:", restaurantId, data);
    // TODO: Later → publish to Redis or emit via WebSocket
}

async function restaurantMenuUpdated(restaurantId, data) {
    console.log("Restaurant menu updated:", restaurantId, data);
    // TODO: Later → publish to Redis or emit via WebSocket
}

module.exports = {
    restaurantProfileUpdated,
    restaurantMenuUpdated
};
