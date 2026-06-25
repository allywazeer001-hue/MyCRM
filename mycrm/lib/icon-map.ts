import {
  GraduationCap, BookOpen, BookMarked, ClipboardList, CalendarCheck,
  FolderOpen, FileQuestion, CreditCard, Award, Users,
  Landmark, ArrowLeftRight, HandCoins, FileCheck, MessageSquareWarning,
  HeartPulse, Stethoscope, CalendarClock, FileHeart, ReceiptText, FlaskConical,
  FileText, AlertTriangle, UserCheck, Heart, Target, HandHeart,
  DollarSign, Briefcase, UserCog, Database, Package,
  Building2, Home, ShoppingCart, Truck, Tag, Star, Bell, Mail, Phone, Globe,
  Shield, Lock, Key, Calendar, Clock, MapPin, BarChart3, PieChart, TrendingUp,
  Activity, CheckSquare, Settings, Network, Server, Cloud, Archive, Box,
  Search, Bookmark, MessageSquare, User, UserPlus, Wallet, Folder, File,
  Clipboard, Code, Coins, ShoppingBag, TrendingDown, Layers, Zap, Workflow,
  UserMinus, Receipt, Handshake,
} from "lucide-react";
import type { ElementType } from "react";

export const LUCIDE_MAP: Record<string, ElementType> = {
  // People & Teams
  Users, User, UserCog, UserCheck, UserPlus, UserMinus,
  // Business
  Briefcase, Building2, Home, Network, Award,
  // Education
  GraduationCap, BookOpen, BookMarked, ClipboardList, CalendarCheck,
  // Documents & Files
  FileText, FolderOpen, FileQuestion, FileCheck, FileHeart, File, Folder,
  Clipboard, Archive, Bookmark,
  // Healthcare
  HeartPulse, Stethoscope, CalendarClock, ReceiptText, FlaskConical, Activity,
  // Finance & Payments
  DollarSign, CreditCard, Landmark, ArrowLeftRight, HandCoins, Wallet,
  Coins, TrendingUp, TrendingDown, Receipt, BarChart3, PieChart,
  // Insurance & Security
  Shield, Lock, Key, AlertTriangle, MessageSquareWarning,
  // NGO & Social
  Heart, Target, HandHeart, Handshake, Globe,
  // Commerce & Logistics
  ShoppingCart, ShoppingBag, Truck, Tag, Package, Box,
  // Communication
  MessageSquare, Mail, Phone, Bell,
  // Tech & Dev
  Database, Server, Cloud, Code, Layers, Settings, Search, Zap, Workflow,
  // Time & Location
  Calendar, Clock, MapPin, Star, CheckSquare,
};

export const LUCIDE_ICON_NAMES: string[] = Object.keys(LUCIDE_MAP).sort();
