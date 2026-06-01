export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELLED" | "DISBURSED";


interface BaseTransactionDetails {
    transaction_id: string;
    trip_id: string;
    amount: string | number;
    status: TransactionStatus;
    created_at: Date | string;
}

export interface PaymentDetails extends BaseTransactionDetails {
    type: "PAYMENT";
    updated_at: Date | string;
    expiration_date?: Date | string | null;
    external_id?: string | null;
}

export interface DisbursementDetails extends BaseTransactionDetails {
    type: "DISBURSEMENT";
    platform_fee: string | number;
}

export interface RefundDetails extends BaseTransactionDetails {
    type: "REFUND";
    refund_type: "TOTAL" | "PARTIAL";
}

export type TransactionDetailProps = PaymentDetails | DisbursementDetails | RefundDetails;