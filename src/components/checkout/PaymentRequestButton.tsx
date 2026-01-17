'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentRequestButtonElement,
  useStripe,
} from '@stripe/react-stripe-js';
import { StripeProductKey } from '@/lib/stripe';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface PaymentRequestButtonProps {
  amount: number; // In øre
  currency: string; // 'nok'
  planName: string;
  productKey: StripeProductKey;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCanMakePayment?: (canMake: boolean) => void; // Callback to parent
}

export default function PaymentRequestButton(
  props: PaymentRequestButtonProps
) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentRequestForm {...props} />
    </Elements>
  );
}

function PaymentRequestForm({
  amount,
  currency,
  planName,
  productKey,
  onSuccess,
  onError,
  onCanMakePayment,
}: PaymentRequestButtonProps) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] =
    useState<any | null>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: 'NO',
      currency: currency.toLowerCase(),
      total: {
        label: planName,
        amount: amount,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    // Check if browser supports Apple Pay / Google Pay
    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
        onCanMakePayment?.(true); // Notify parent that wallets are supported
      } else {
        onCanMakePayment?.(false); // Notify parent that wallets are NOT supported
      }
    });

    // Handle payment method received
    pr.on('paymentmethod', async (ev) => {
      if (isProcessing) return;

      setIsProcessing(true);

      try {
        // Get email from wallet
        const payerEmail = ev.payerEmail;

        if (!payerEmail) {
          ev.complete('fail');
          onError('Email is required from wallet');
          setIsProcessing(false);
          return;
        }

        // 1. Create Payment Intent on server
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: payerEmail, productKey }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const { clientSecret } = await response.json();

        // 2. Confirm payment with Stripe
        const { error: confirmError } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmError) {
          ev.complete('fail');
          onError(confirmError.message || 'Payment failed');
        } else {
          ev.complete('success');

          // Store email from wallet in localStorage for verification
          if (typeof window !== 'undefined') {
            localStorage.setItem('user_email', payerEmail);
          }

          onSuccess();
        }
      } catch (err) {
        ev.complete('fail');
        const errorMessage =
          err instanceof Error ? err.message : 'Payment failed';
        onError(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    });
  }, [stripe, amount, currency, planName, productKey, onSuccess, onError, onCanMakePayment, isProcessing]);

  if (!canMakePayment) {
    return null; // Component hides if wallets not supported
  }

  return (
    <div className="mb-4">
      <PaymentRequestButtonElement
        options={{ paymentRequest }}
        className="PaymentRequestButton"
      />
      <style jsx global>{`
        .PaymentRequestButton {
          height: 48px !important;
        }
        .PaymentRequestButton iframe {
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
