import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString, IsUUID, Length, Matches, ValidateIf } from 'class-validator';

export class CheckoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  laptopIds: string[];

  @IsString()
  @Length(15, 500)
  shippingAddress: string;

  @IsIn(['cod', 'online', 'credit'])
  paymentMethod: 'cod' | 'online' | 'credit';

  @ValidateIf(o => o.paymentMethod === 'credit')
  @IsString()
  @Length(2, 50)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9\-\/ .]*$/, { message: 'PO number may contain letters, numbers, spaces, - / and .' })
  poNumber?: string;
}

export class VerifyCheckoutDto {
  @IsString()
  @Length(1, 100)
  razorpay_order_id: string;

  @IsString()
  @Length(1, 100)
  razorpay_payment_id: string;

  @IsString()
  @Length(1, 200)
  razorpay_signature: string;
}
