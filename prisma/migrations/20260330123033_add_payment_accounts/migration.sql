-- CreateTable
CREATE TABLE "payment_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "paystack_subaccount_code" TEXT,
    "paystack_recipient_code" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_accounts_user_id_key" ON "payment_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_accounts_paystack_subaccount_code_key" ON "payment_accounts"("paystack_subaccount_code");

-- CreateIndex
CREATE UNIQUE INDEX "payment_accounts_paystack_recipient_code_key" ON "payment_accounts"("paystack_recipient_code");

-- AddForeignKey
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
