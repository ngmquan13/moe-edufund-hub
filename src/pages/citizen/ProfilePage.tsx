import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Save, AlertCircle, CreditCard, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { CitizenLayout } from '@/components/layouts/CitizenLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getAccountHolder,
  getEducationAccountByHolder,
  formatDate,
  getSchoolingLabel
} from '@/lib/data';
import { toast } from '@/hooks/use-toast';

interface PaymentCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
  cardholderName: string;
}

const ProfilePage: React.FC = () => {
  const { citizenUser } = useAuth();
  const holder = citizenUser ? getAccountHolder(citizenUser.id) : null;
  const educationAccount = citizenUser ? getEducationAccountByHolder(citizenUser.id) : null;
  
  const [phone, setPhone] = useState(holder?.phone || '');
  const [email, setEmail] = useState(holder?.email || '');
  const [address, setAddress] = useState(holder?.address || '');
  const [isEditing, setIsEditing] = useState(false);

  // Payment Cards State
  const [savedCards, setSavedCards] = useState<PaymentCard[]>([
    { id: '1', last4: '4242', brand: 'Visa', expiryMonth: '12', expiryYear: '26', isDefault: true, cardholderName: 'John Doe' },
  ]);
  const [addCardDialogOpen, setAddCardDialogOpen] = useState(false);
  const [editCardDialogOpen, setEditCardDialogOpen] = useState(false);
  const [deleteCardDialogOpen, setDeleteCardDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PaymentCard | null>(null);
  
  // New Card Form
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCvc, setNewCardCvc] = useState('');
  const [newCardName, setNewCardName] = useState('');

  if (!holder) {
    return (
      <CitizenLayout>
        <div className="text-center py-16">
          <p>Profile not found</p>
        </div>
      </CitizenLayout>
    );
  }

  const handleSave = () => {
    toast({
      title: "Profile Updated",
      description: "Your contact details have been updated successfully.",
    });
    setIsEditing(false);
  };

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
      cardholderName: newCardName,
    };

    setSavedCards([...savedCards, newCard]);
    setAddCardDialogOpen(false);
    resetCardForm();
    
    toast({
      title: "Card Added",
      description: `Card ending in ${last4} has been added`,
    });
  };

  const handleEditCard = () => {
    if (!selectedCard) return;
    
    const [month, year] = newCardExpiry.split('/');
    
    setSavedCards(savedCards.map(card => 
      card.id === selectedCard.id 
        ? { ...card, expiryMonth: month, expiryYear: year, cardholderName: newCardName }
        : card
    ));
    
    setEditCardDialogOpen(false);
    resetCardForm();
    
    toast({
      title: "Card Updated",
      description: "Card details have been updated",
    });
  };

  const handleDeleteCard = () => {
    if (!selectedCard) return;
    
    const wasDefault = selectedCard.isDefault;
    const newCards = savedCards.filter(card => card.id !== selectedCard.id);
    
    // If deleted card was default, make the first remaining card default
    if (wasDefault && newCards.length > 0) {
      newCards[0].isDefault = true;
    }
    
    setSavedCards(newCards);
    setDeleteCardDialogOpen(false);
    setSelectedCard(null);
    
    toast({
      title: "Card Removed",
      description: "Card has been removed from your account",
    });
  };

  const handleSetDefault = (cardId: string) => {
    setSavedCards(savedCards.map(card => ({
      ...card,
      isDefault: card.id === cardId
    })));
    
    toast({
      title: "Default Card Updated",
      description: "Your default payment card has been updated",
    });
  };

  const resetCardForm = () => {
    setNewCardNumber('');
    setNewCardExpiry('');
    setNewCardCvc('');
    setNewCardName('');
    setSelectedCard(null);
  };

  const openEditDialog = (card: PaymentCard) => {
    setSelectedCard(card);
    setNewCardName(card.cardholderName);
    setNewCardExpiry(`${card.expiryMonth}/${card.expiryYear}`);
    setEditCardDialogOpen(true);
  };

  const openDeleteDialog = (card: PaymentCard) => {
    setSelectedCard(card);
    setDeleteCardDialogOpen(true);
  };

  return (
    <CitizenLayout>
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">My Details</h1>
        <p className="mt-1 text-muted-foreground">
          View and update your personal information
        </p>
      </div>

      {/* Profile Header */}
      <Card className="mb-6 animate-slide-up">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl font-bold text-primary">
                {holder.firstName[0]}{holder.lastName[0]}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {holder.firstName} {holder.lastName}
              </h2>
              <p className="text-muted-foreground">Education Account: {educationAccount?.id || 'N/A'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Member since {formatDate(holder.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information (Read-only) */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              This information is managed by the Ministry of Education
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                To update these details, please contact the Ministry of Education.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Full Name</Label>
                <p className="font-medium mt-1">{holder.firstName} {holder.lastName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Date of Birth</Label>
                <p className="font-medium mt-1">{formatDate(holder.dateOfBirth)} ({holder.age} years old)</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Schooling Status</Label>
                <p className="font-medium mt-1">{getSchoolingLabel(holder.schoolingStatus)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information (Editable) */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
                <CardDescription>
                  You can update these details
                </CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Cards Section */}
      <Card className="mt-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Cards
              </CardTitle>
              <CardDescription>
                Manage your saved payment cards
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddCardDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {savedCards.length > 0 ? (
            <div className="space-y-3">
              {savedCards.map(card => (
                <div 
                  key={card.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-14 bg-muted rounded flex items-center justify-center text-xs font-semibold">
                      {card.brand}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">•••• •••• •••• {card.last4}</p>
                        {card.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {card.cardholderName} • Expires {card.expiryMonth}/{card.expiryYear}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!card.isDefault && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSetDefault(card.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditDialog(card)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(card)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No saved cards</p>
              <p className="text-sm">Add a card to make payments faster</p>
            </div>
          )}
        </CardContent>
      </Card>

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
            <Button variant="outline" onClick={() => { setAddCardDialogOpen(false); resetCardForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddCard}>
              Add Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Card Dialog */}
      <Dialog open={editCardDialogOpen} onOpenChange={setEditCardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Card</DialogTitle>
            <DialogDescription>
              Update your card details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Card Number</p>
              <p className="font-medium">•••• •••• •••• {selectedCard?.last4}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCardName">Name on Card</Label>
              <Input 
                id="editCardName"
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editExpiry">Expiry Date</Label>
              <Input 
                id="editExpiry"
                placeholder="MM/YY"
                value={newCardExpiry}
                onChange={(e) => setNewCardExpiry(formatExpiry(e.target.value))}
                maxLength={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditCardDialogOpen(false); resetCardForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleEditCard}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Card Confirmation */}
      <AlertDialog open={deleteCardDialogOpen} onOpenChange={setDeleteCardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the card ending in {selectedCard?.last4}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCard(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CitizenLayout>
  );
};

export default ProfilePage;
