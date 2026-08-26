-- AlterTable
ALTER TABLE "payment_accounts" ADD COLUMN "flutterwave_subaccount_id" TEXT;
ALTER TABLE "payment_accounts" ADD COLUMN "flutterwave_beneficiary_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payment_accounts_flutterwave_subaccount_id_key" ON "payment_accounts"("flutterwave_subaccount_id");
CREATE UNIQUE INDEX "payment_accounts_flutterwave_beneficiary_id_key" ON "payment_accounts"("flutterwave_beneficiary_id");
