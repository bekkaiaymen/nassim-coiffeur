const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicates and faster queries
favoriteSchema.index({ user: 1, business: 1 }, { unique: true });
favoriteSchema.index({ customer: 1, business: 1 });

module.exports = mongoose.model('Favorite', favoriteSchema);
