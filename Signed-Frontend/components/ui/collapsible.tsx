import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';

type CollapsibleProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

export function Collapsible({ open, onOpenChange, children }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState<boolean>(!!open);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    onOpenChange?.(next);
  };

  return (
    <View accessibilityRole="summary" data-slot="collapsible">
      {React.Children.map(children, (child) => child)}
    </View>
  );
}

type CollapsibleTriggerProps = {
  onPress?: () => void;
  children?: React.ReactNode;
};

export function CollapsibleTrigger({ onPress, children }: CollapsibleTriggerProps) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress}>
      {children}
    </TouchableOpacity>
  );
}

type CollapsibleContentProps = {
  visible?: boolean;
  children?: React.ReactNode;
};

export function CollapsibleContent({ visible, children }: CollapsibleContentProps) {
  if (!visible) return null;
  return <View data-slot="collapsible-content">{children}</View>;
}
