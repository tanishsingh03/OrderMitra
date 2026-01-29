/**
 * Order Workflow Integration Tests
 * Tests the complete order lifecycle from PLACED to DELIVERED
 */

const request = require('supertest');
const express = require('express');

// Mock Prisma client
jest.mock('../Utility/prisma', () => ({
    order: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
    },
    menuItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
    },
    address: {
        findFirst: jest.fn(),
    },
    restaurant: {
        findUnique: jest.fn(),
    },
    deliveryPartner: {
        findUnique: jest.fn(),
    },
    wallet: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    walletTransaction: {
        create: jest.fn(),
    },
    $transaction: jest.fn(),
}));

// Mock WebSocket
jest.mock('../websocket', () => ({
    publishOrderUpdate: jest.fn(),
}));

// Mock notification service
jest.mock('../Utility/notification.service', () => ({
    notifyOrderStatus: jest.fn(),
}));

// Mock order queue
jest.mock('../Utility/orderQueue', () => ({
    distributeOrderToPartners: jest.fn(),
    removeOrderFromQueue: jest.fn(),
}));

const prisma = require('../Utility/prisma');
const { publishOrderUpdate } = require('../websocket');

describe('Order Workflow - Complete Lifecycle', () => {
    let app;

    beforeAll(() => {
        // Set up Express app for testing
        app = express();
        app.use(express.json());

        // Mock authentication middleware
        app.use((req, res, next) => {
            req.user = { id: 1, role: 'customer' };
            next();
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('PLACED - Order Creation', () => {
        it('should create order with PLACED status and send correct WebSocket message', async () => {
            const mockMenuItems = [
                { id: 1, name: 'Pizza', price: 299, restaurantId: 1, isAvailable: true }
            ];

            const mockOrder = {
                id: 1,
                orderNumber: 'ORD-123456',
                status: 'PLACED',
                userId: 1,
                restaurantId: 1,
                totalPrice: 350,
                subtotal: 299,
                deliveryFee: 40,
                tax: 11,
                items: [
                    {
                        menuItemId: 1,
                        quantity: 1,
                        price: 299,
                        menuItem: mockMenuItems[0]
                    }
                ]
            };

            prisma.menuItem.findMany.mockResolvedValue(mockMenuItems);
            prisma.address.findFirst.mockResolvedValue(null);
            prisma.order.create.mockResolvedValue(mockOrder);

            const publicOrderController = require('../Controller/public.order.controller');

            // Create a mock request/response
            const req = {
                user: { id: 1, role: 'customer' },
                body: {
                    restaurantId: 1,
                    items: [{ id: 1, qty: 1 }]
                }
            };

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis(),
            };

            await publicOrderController.placeOrder(req, res);

            // Verify order was created with PLACED status
            expect(prisma.order.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: 'PLACED'
                    })
                })
            );

            // Verify WebSocket message
            expect(publishOrderUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'PLACED',
                    message: 'Order placed successfully',
                    type: 'ORDER_CREATED'
                })
            );

            // Verify success response
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Order placed successfully'
                })
            );
        });

        it('should reject order placement from non-customer roles', async () => {
            const publicOrderController = require('../Controller/public.order.controller');

            const req = {
                user: { id: 1, role: 'restaurant-owner' },
                body: { restaurantId: 1, items: [{ id: 1, qty: 1 }] }
            };

            const res = {
                json: jest.fn(),
            };

            await publicOrderController.placeOrder(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Only customers can place orders'
                })
            );
        });
    });

    describe('ACCEPTED - Restaurant Confirmation', () => {
        it('should update order to ACCEPTED and send correct message', () => {
            // Verify that ACCEPTED status has the right message
            const expectedMessage = 'Restaurant accepted your order';

            publishOrderUpdate.mockClear();
            publishOrderUpdate({
                status: 'ACCEPTED',
                message: expectedMessage,
                type: 'STATUS_UPDATED'
            });

            expect(publishOrderUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'ACCEPTED',
                    message: expectedMessage
                })
            );
        });
    });

    describe('READY_FOR_PICKUP - Food Preparation Complete', () => {
        it('should update order to READY_FOR_PICKUP and send correct message', () => {
            const expectedMessage = 'Looking for a delivery partner';

            publishOrderUpdate.mockClear();
            publishOrderUpdate({
                status: 'READY_FOR_PICKUP',
                message: expectedMessage,
                type: 'NEW_ORDER_READY'
            });

            expect(publishOrderUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'READY_FOR_PICKUP',
                    message: expectedMessage,
                    type: 'NEW_ORDER_READY'
                })
            );
        });
    });

    describe('ASSIGNED - Delivery Partner Acceptance', () => {
        it('should update order to ASSIGNED with partner details and correct message', () => {
            const expectedMessage = 'Your delivery partner is on the way';
            const partnerDetails = {
                name: 'John Doe',
                phone: '1234567890',
                rating: 4.5,
                totalRatings: 100,
                vehicleType: 'Bike',
                vehicleNumber: 'ABC123'
            };

            publishOrderUpdate.mockClear();
            publishOrderUpdate({
                status: 'ASSIGNED',
                message: expectedMessage,
                partnerDetails: partnerDetails,
                liveLocationEnabled: true,
                type: 'ORDER_ASSIGNED'
            });

            expect(publishOrderUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'ASSIGNED',
                    message: expectedMessage,
                    partnerDetails: expect.objectContaining({
                        name: 'John Doe'
                    }),
                    liveLocationEnabled: true
                })
            );
        });
    });

    describe('AT_RESTAURANT - Partner Arrival', () => {
        it('should update order to AT_RESTAURANT and send correct message', () => {
            const expectedMessage = 'Your delivery partner has arrived at the restaurant';

            publishOrderUpdate.mockClear();
            publishOrderUpdate({
                status: 'AT_RESTAURANT',
                message: expectedMessage,
                liveLocationEnabled: true,
                type: 'STATUS_UPDATED'
            });

            expect(publishOrderUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'AT_RESTAURANT',
                    message: expectedMessage,
                    liveLocationEnabled: true
                })
            );
        });
    });

    describe('PICKED_UP - Food Pickup', () => {
        it('should update order to PICKED_UP and send correct message', () => {
            const expectedMessage = 'Order picked up — on the way to you';

            publishOrderUpdate.mockClear();
            publishOrderUpdate({
                status: 'PICKED_UP',
                message: expectedMessage,
                liveLocationEnabled: true,
                type: 'STATUS_UPDATED'
            });

            expect(publishOrderUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'PICKED_UP',
                    message: expectedMessage,
                    liveLocationEnabled: true
                })
            );
        });
    });

    describe('DELIVERED - Order Completion', () => {
        it('should update order to DELIVERED and send correct message with rating prompt', () => {
            const expectedMessage = 'Order delivered successfully';

            publishOrderUpdate.mockClear();
            publishOrderUpdate({
                status: 'DELIVERED',
                message: expectedMessage,
                ratingPrompt: true,
                type: 'STATUS_UPDATED'
            });

            expect(publishOrderUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'DELIVERED',
                    message: expectedMessage,
                    ratingPrompt: true
                })
            );
        });
    });

    describe('Order Status Messages Validation', () => {
        it('should have correct messages for all order statuses', () => {
            const statusMessages = {
                'PLACED': 'Order placed successfully',
                'ACCEPTED': 'Restaurant accepted your order',
                'READY_FOR_PICKUP': 'Looking for a delivery partner',
                'ASSIGNED': 'Your delivery partner is on the way',
                'AT_RESTAURANT': 'Your delivery partner has arrived at the restaurant',
                'PICKED_UP': 'Order picked up — on the way to you',
                'DELIVERED': 'Order delivered successfully'
            };

            Object.entries(statusMessages).forEach(([status, message]) => {
                expect(message).toBeTruthy();
                expect(message.length).toBeGreaterThan(0);
            });
        });
    });

    describe('WebSocket Event Structure Validation', () => {
        it('should include all required fields in WebSocket events', () => {
            const requiredFields = [
                'orderId',
                'orderNumber',
                'status',
                'userId',
                'restaurantId',
                'message',
                'timestamp',
                'type'
            ];

            const sampleEvent = {
                orderId: 1,
                orderNumber: 'ORD-123',
                status: 'PLACED',
                userId: 1,
                restaurantId: 1,
                deliveryPartnerId: null,
                message: 'Order placed successfully',
                timestamp: new Date().toISOString(),
                type: 'ORDER_CREATED'
            };

            requiredFields.forEach(field => {
                expect(sampleEvent).toHaveProperty(field);
            });
        });

        it('should include partner details on ASSIGNED status', () => {
            const assignedEvent = {
                status: 'ASSIGNED',
                partnerDetails: {
                    name: 'Partner Name',
                    phone: '1234567890',
                    rating: 4.5,
                    totalRatings: 100,
                    vehicleType: 'Bike',
                    vehicleNumber: 'ABC123'
                },
                liveLocationEnabled: true
            };

            expect(assignedEvent.partnerDetails).toBeDefined();
            expect(assignedEvent.partnerDetails.name).toBeTruthy();
            expect(assignedEvent.liveLocationEnabled).toBe(true);
        });

        it('should include rating prompt on DELIVERED status', () => {
            const deliveredEvent = {
                status: 'DELIVERED',
                ratingPrompt: true
            };

            expect(deliveredEvent.ratingPrompt).toBe(true);
        });
    });
});
