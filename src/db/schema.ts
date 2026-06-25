// Translates db schemas defined in documentation to TS code
import { pgTable, serial, uuid, varchar, decimal, timestamp, text, integer, pgEnum, uniqueIndex, boolean} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { TransactionStatus } from "@/types/transaction";

export const refundTypeEnum = pgEnum('refund_type_enum', ['TOTAL', 'PARTIAL']);

// Users table
export const users = pgTable('users', {
    id_user: serial('id_user').primaryKey(),
    id_clerk: varchar('clerk_id', { length: 255 }).notNull().unique(),
    balance: decimal('balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
    is_banned: boolean('is_banned').notNull().default(false),
});

// Payments table
export const payments = pgTable('payments', {
    transaction_id: uuid('transaction_id').defaultRandom().primaryKey(),
    trip_id: varchar('trip_id', { length: 255 }).notNull(),
    id_user: integer('id_user').references(() => users.id_user).notNull(), // FK al usuario que paga
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    external_id: varchar('external_id', { length: 255 }), // Puede ser null hasta que MP lo confirme
    status: varchar('status', { length: 50 }).$type<TransactionStatus>().notNull().default('PENDING'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'),
}, (table) => ({
    // Partial index to ensure only one active payment per trip (ignoring deleted payments)
    uniqueActivePayment: uniqueIndex('unique_active_trip_payment')
        .on(table.trip_id)
        .where(sql`${table.deleted_at} IS NULL`),
}));

// Disbursements table
export const disbursements = pgTable('disbursements', {
    transaction_id: uuid('transaction_id').defaultRandom().primaryKey(),
    trip_id: varchar('trip_id', { length: 255 }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    id_user: integer('id_user').references(() => users.id_user).notNull(), // FK al usuario que recibe
    platform_fee: decimal('platform_fee', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 50 }).$type<TransactionStatus>().notNull().default('PENDING'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'),
}, (table) => ({
    uniqueActiveDisbursement: uniqueIndex('unique_active_trip_disbursement')
        .on(table.trip_id)
        .where(sql`${table.deleted_at} IS NULL`),
}));

// Refunds table
export const refunds = pgTable('refunds', {
    transaction_id: uuid('transaction_id').defaultRandom().primaryKey(),
    trip_id: varchar('trip_id', { length: 255 }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    id_user: integer('id_user').references(() => users.id_user).notNull(), // FK al usuario devuelto
    refund_type: refundTypeEnum('refund_type').notNull(), // ej: 'TOTAL', 'PARTIAL'
    status: varchar('status', { length: 50 }).$type<TransactionStatus>().notNull().default('PENDING'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'),
}, (table) => ({
    uniqueActiveRefund: uniqueIndex('unique_active_trip_refund')
        .on(table.trip_id)
        .where(sql`${table.deleted_at} IS NULL`),
}));