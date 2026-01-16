import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CreditCard, 
  Plus, 
  Wallet, 
  CheckCircle2, 
  XCircle,
  ArrowLeft,
  BookOpen,
  Trash2,
  Shield
} from 'lucide-react';
import { CitizenLayout } from '@/components/layouts/CitizenLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/hooks/useDataStore';
import {
  getEducationAccountByHolder,
  getOutstandingChargesByAccount,
  getCourse,
  updateEducationAccount,
  updateOutstandingCharge,
  addTransaction
} from '@/lib/dataStore';
import { formatCurrency, formatDate, OutstandingCharge, PaymentMethodBreakdown } from '@/lib/data';
import { toast } from '@/hooks/use-toast';

interface PaymentCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
}

type PaymentMethod = 'balance' | 'card' | 'combined';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { citizenUser } = useAuth();
  
  const educationAccount = citizenUser ? getEducationAccountByHolder(citizenUser.id) : null;
  const outstandingCharges = educationAccount ? getOutstandingChargesByAccount(educationAccount.id) : [];
  
  useDataStore(() => educationAccount);

  // Get selected charge IDs from navigation state
  const selectedChargeIds = (location.state?.selectedCharges as string[]) || [];
  const selectedCharges = outstandingCharges.filter(c => selectedChargeIds.includes(c.id));

  // Mock saved cards - in real app, fetch from backend
  const [savedCards, setSavedCards] = useState<PaymentCard[]>([
    { id: '1', last4: '4242', brand: 'Visa', expiryMonth: '12', expiryYear: '26', isDefault: true },
  ]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [selectedCardId, setSelectedCardId] = useState<string>(savedCards[0]?.id || '');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<'success' | 'error' | null>(null);
  
  // Add card dialog
  const [addCardDialogOpen, setAddCardDialogOpen] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCvc, setNewCardCvc] = useState('');
  const [newCardName, setNewCardName] = useState('');

  const balance = educationAccount?.balance || 0;
  const selectedTotal = selectedCharges.reduce((sum, c) => sum + c.amount, 0);
  const canPayWithBalance = balance >= selectedTotal;
  const remainingAfterBalance = Math.max(0, selectedTotal - balance);

  // Redirect if no charges selected
  useEffect(() => {
    if (selectedChargeIds.length === 0) {
      navigate('/portal/courses');
    }
  }, [selectedChargeIds, navigate]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleAddCard = () => {
    if (!newCardNumber || !newCardExpiry || !newCardCvc || !newCardName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all card details",
        variant: "destructive",
      });
      return;
    }

    const last4 = newCardNumber.replace(/\s/g, '').slice(-4);
    const [month, year] = newCardExpiry.split('/');
    
    const newCard: PaymentCard = {
      id: `card-${Date.now()}`,
      last4,
      brand: 'Visa',
      expiryMonth: month,
      expiryYear: year,
      isDefault: savedCards.length === 0,
    };

    setSavedCards([...savedCards, newCard]);
    setSelectedCardId(newCard.id);
    setAddCardDialogOpen(false);
    setNewCardNumber('');
    setNewCardExpiry('');
    setNewCardCvc('');
    setNewCardName('');
    
    toast({
      title: "Card Added",
      description: `Card ending in ${last4} has been added`,
    });
  };

  const processPayment = () => {
    if (!educationAccount || selectedCharges.length === 0) return;

    if (paymentMethod === 'card' && !selectedCardId) {
      toast({
        title: "Select Payment Card",
        description: "Please select or add a payment card",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayment(true);

    // Simulate payment processing
    setTimeout(() => {
      try {
        let balanceUsed = 0;
        let cardPayment = 0;

        if (paymentMethod === 'balance') {
          if (!canPayWithBalance) {
            throw new Error('Insufficient balance');
          }
          balanceUsed = selectedTotal;
        } else if (paymentMethod === 'card') {
          cardPayment = selectedTotal;
        } else if (paymentMethod === 'combined') {
          balanceUsed = Math.min(balance, selectedTotal);
          cardPayment = remainingAfterBalance;
        }

        // Build course items with course codes for transaction details
        const courseItems = selectedCharges.map(c => {
          const course = getCourse(c.courseId);
          return {
            courseId: c.courseId,
            courseCode: course?.code || c.courseName,
            courseName: c.courseName,
            amount: c.amount
          };
        });

        // Build description using course codes: "Course Fee - CODE1" or "Course Fee - CODE1, CODE2"
        const courseCodes = courseItems.map(c => c.courseCode);
        const description = `Course Fee - ${courseCodes.join(', ')}`;

        // Build payment breakdown for combined payments
        const paymentBreakdown: PaymentMethodBreakdown[] = [];
        const card = savedCards.find(c => c.id === selectedCardId);
        
        if (balanceUsed > 0) {
          paymentBreakdown.push({
            method: 'balance',
            amount: balanceUsed
          });
        }
        
        if (cardPayment > 0) {
          paymentBreakdown.push({
            method: 'card',
            amount: cardPayment,
            cardLast4: card?.last4
          });
        }

        // Update account balance if using balance
        if (balanceUsed > 0) {
          updateEducationAccount(educationAccount.id, {
            balance: balance - balanceUsed
          });
        }

        // Create a SINGLE transaction for all payment methods
        addTransaction({
          id: `TXN${String(Date.now()).slice(-6)}`,
          accountId: educationAccount.id,
          type: 'payment',
          amount: -selectedTotal,
          balanceAfter: balance - balanceUsed,
          description: description,
          reference: `PAY-${Date.now()}`,
          status: 'completed',
          createdAt: new Date().toISOString(),
          courses: courseItems,
          paymentMethod: paymentMethod,
          paymentBreakdown: paymentBreakdown,
        });

        // Update outstanding charges to paid
        selectedCharges.forEach(charge => {
          updateOutstandingCharge(charge.id, { status: 'paid' });
        });

        setPaymentResult('success');
      } catch (error) {
        setPaymentResult('error');
      } finally {
        setProcessingPayment(false);
      }
    }, 2000);
  };

  const handleBackToCourses = () => {
    navigate('/portal/courses');
  };

  if (paymentResult === 'success') {
    return (
      <CitizenLayout>
        <div className="max-w-2xl mx-auto py-12">
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-success/10 mb-6">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-6">
                Your payment of {formatCurrency(selectedTotal)} has been processed successfully.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">Updated Balance</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(educationAccount?.balance || 0)}
                </p>
              </div>
              <Button onClick={handleBackToCourses} className="w-full max-w-xs">
                Back to My Courses
              </Button>
            </CardContent>
          </Card>
        </div>
      </CitizenLayout>
    );
  }

  if (paymentResult === 'error') {
    return (
      <CitizenLayout>
        <div className="max-w-2xl mx-auto py-12">
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-6">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Payment Failed</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't process your payment. Please try again.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={handleBackToCourses}>
                  Cancel
                </Button>
                <Button onClick={() => setPaymentResult(null)}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </CitizenLayout>
    );
  }

  return (
    <CitizenLayout>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={handleBackToCourses} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
        <p className="text-muted-foreground">Complete your course fee payment</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Payment Method - Left Side */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
              <CardDescription>Select how you want to pay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Balance Option */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Account Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(balance)}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>

              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                {/* Pay with Balance */}
                <div className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  paymentMethod === 'balance' ? 'border-primary bg-primary/5' : ''
                } ${!canPayWithBalance ? 'opacity-50' : ''}`}>
                  <RadioGroupItem value="balance" id="balance" disabled={!canPayWithBalance} className="mt-1" />
                  <Label htmlFor="balance" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      <span className="font-medium">Pay with Account Balance</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use your education account balance
                    </p>
                    {!canPayWithBalance && (
                      <p className="text-sm text-destructive mt-1">
                        Insufficient balance (need {formatCurrency(selectedTotal - balance)} more)
                      </p>
                    )}
                  </Label>
                </div>

                {/* Pay with Card */}
                <div className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  paymentMethod === 'card' ? 'border-primary bg-primary/5' : ''
                }`}>
                  <RadioGroupItem value="card" id="card" className="mt-1" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span className="font-medium">Pay with Card</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pay the full amount with a credit/debit card
                    </p>
                  </Label>
                </div>

                {/* Combined Payment - only show if balance is insufficient */}
                {!canPayWithBalance && balance > 0 && (
                  <div className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === 'combined' ? 'border-primary bg-primary/5' : ''
                  }`}>
                    <RadioGroupItem value="combined" id="combined" className="mt-1" />
                    <Label htmlFor="combined" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        <span className="font-medium">Combined Payment</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Use {formatCurrency(balance)} balance + {formatCurrency(remainingAfterBalance)} by card
                      </p>
                    </Label>
                  </div>
                )}
              </RadioGroup>

              {/* Card Selection - show when paying with card or combined */}
              {(paymentMethod === 'card' || paymentMethod === 'combined') && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Select a Card</h4>
                  
                  {savedCards.length > 0 ? (
                    <RadioGroup value={selectedCardId} onValueChange={setSelectedCardId}>
                      {savedCards.map(card => (
                        <div 
                          key={card.id}
                          className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedCardId === card.id ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          <RadioGroupItem value={card.id} id={card.id} />
                          <Label htmlFor={card.id} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-12 bg-muted rounded flex items-center justify-center text-xs font-semibold">
                                  {card.brand}
                                </div>
                                <div>
                                  <p className="font-medium">•••• •••• •••• {card.last4}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Expires {card.expiryMonth}/{card.expiryYear}
                                  </p>
                                </div>
                              </div>
                              {card.isDefault && (
                                <Badge variant="secondary">Default</Badge>
                              )}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground border rounded-lg">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No saved cards</p>
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setAddCardDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Card
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <Shield className="h-5 w-5 flex-shrink-0" />
            <p>Your payment information is encrypted and secure. We do not store your full card details.</p>
          </div>
        </div>

        {/* Order Summary - Right Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Courses Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Courses</CardTitle>
              <CardDescription>{selectedCharges.length} item(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCharges.map(charge => {
                const course = getCourse(charge.courseId);
                return (
                  <div key={charge.id} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{charge.courseName}</p>
                      <p className="text-sm text-muted-foreground">{charge.period}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(charge.amount)}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Order Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({selectedCharges.length} item{selectedCharges.length !== 1 ? 's' : ''})</span>
                  <span>{formatCurrency(selectedTotal)}</span>
                </div>
                {paymentMethod === 'balance' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">From Balance</span>
                    <span className="text-success">-{formatCurrency(selectedTotal)}</span>
                  </div>
                )}
                {paymentMethod === 'combined' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">From Balance</span>
                      <span className="text-success">-{formatCurrency(Math.min(balance, selectedTotal))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">From Card</span>
                      <span>{formatCurrency(remainingAfterBalance)}</span>
                    </div>
                  </>
                )}
              </div>
              
              <Separator />
              
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatCurrency(selectedTotal)}</span>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={processPayment}
                disabled={processingPayment || (paymentMethod !== 'balance' && !selectedCardId)}
              >
                {processingPayment ? (
                  <>Processing...</>
                ) : (
                  <>Pay {formatCurrency(selectedTotal)}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Card Dialog */}
      <Dialog open={addCardDialogOpen} onOpenChange={setAddCardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Card</DialogTitle>
            <DialogDescription>
              Enter your card details securely
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cardName">Name on Card</Label>
              <Input 
                id="cardName"
                placeholder="John Doe"
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input 
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={newCardNumber}
                onChange={(e) => setNewCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input 
                  id="expiry"
                  placeholder="MM/YY"
                  value={newCardExpiry}
                  onChange={(e) => setNewCardExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input 
                  id="cvc"
                  placeholder="123"
                  value={newCardCvc}
                  onChange={(e) => setNewCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCardDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCard}>
              Add Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CitizenLayout>
  );
};

export default CheckoutPage;
