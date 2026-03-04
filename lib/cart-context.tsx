"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export interface CartItem {
  product: string
  paymentTerms: string
  options: Record<string, string | string[]>
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (idx: number) => void
  updateCartItem: (idx: number, item: CartItem) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  // Load from local storage on mount
  useEffect(() => {
    setMounted(true)
    try {
      const savedCart = localStorage.getItem("dnd_inquiry_cart")
      if (savedCart) {
        setCart(JSON.parse(savedCart))
      }
    } catch (e) {
      console.error("Failed to load cart from local storage", e)
    }
  }, [])

  // Save to local storage on change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("dnd_inquiry_cart", JSON.stringify(cart))
    }
  }, [cart, mounted])

  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item])
  }

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateCartItem = (idx: number, item: CartItem) => {
    setCart((prev) => {
      const newCart = [...prev]
      newCart[idx] = item
      return newCart
    })
  }

  const clearCart = () => {
    setCart([])
  }

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateCartItem, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
