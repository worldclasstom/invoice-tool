'use client';

import { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export default function Home() {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, amount: 0 },
  ]);
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);

  // For displaying the date in Thai format
  const displayThaiDate = (date: string) => new Date(date).toLocaleDateString('th-TH', { dateStyle: 'long' });

  const addLineItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      amount: field === 'quantity' || field === 'unitPrice'
        ? Number(newItems[index].quantity) * Number(newItems[index].unitPrice)
        : newItems[index].amount,
    };
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce(
      (sum, item) => sum + parseFloat((Number(item.quantity) * Number(item.unitPrice)).toFixed(2)),
      0
    );
  };

  const calculateTax = () => {
    return parseFloat((calculateSubtotal() * 0.07).toFixed(2));
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          date,
          notes,
          items,
          subtotal: calculateSubtotal(),
          tax: calculateTax(),
          total: calculateTotal(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }

      const data = await response.json();
      
      // Create a blob from the base64 PDF data
      const pdfBlob = new Blob(
        [Buffer.from(data.pdf, 'base64')],
        { type: 'application/pdf' }
      );
      
      // Create a URL for the blob
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Open the PDF in a new window
      window.open(pdfUrl, '_blank');
      
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create invoice. Please try again.');
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        {/* <h1 className="text-3xl font-bold text-gray-900 mb-4">Madre Restaurant Invoice</h1> */}
        <div className="mb-8">
          <Image
            src="/assets/logos/AW_LOGO_MADRE-01.png"
            alt="Madre Cafe and Restaurant Logo"
            width={144}
            height={198}
            priority
          />
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Items</h2>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-madre hover:bg-madre-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-madre"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>

            {/* Table Header Row for desktop */}
            <div className="grid grid-cols-12 gap-4 items-center font-semibold text-gray-700 border-b pb-2 hidden md:grid">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-1"></div>
            </div>

            {/* Desktop rows */}
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-center hidden md:grid">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-madre focus:ring-madre"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="1"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-madre focus:ring-madre"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-madre focus:ring-madre"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={`฿${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}`}
                    readOnly
                    className="block w-full rounded-md border-gray-300 bg-gray-50"
                  />
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Mobile rows */}
            {items.map((item, index) => (
              <div key={index} className="flex flex-col gap-2 border-b py-2 md:hidden">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Description"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-madre focus:ring-madre"
                  required
                />
                <label className="text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-madre focus:ring-madre"
                  required
                />
                <label className="text-sm font-medium text-gray-700">Unit Price</label>
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-madre focus:ring-madre"
                  required
                />
                <label className="text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="text"
                  value={`฿${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}`}
                  readOnly
                  className="block w-full rounded-md border-gray-300 bg-gray-50"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t pt-4">
            <div className="flex justify-end space-y-2">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>฿{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>฿{calculateTotal().toFixed(2)}</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">No VAT</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-madre hover:bg-madre-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-madre"
            >
              Generate Invoice
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
