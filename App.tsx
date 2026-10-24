import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@firecharge/orders_v1";

const COLORS = {
  background: "#101114",
  surface: "#191B20",
  card: "#20232A",
  border: "#30343D",
  orange: "#FF6B22",
  gold: "#FFC857",
  text: "#FFFFFF",
  muted: "#A3A8B3",
  green: "#42D392",
  red: "#FF6464",
};

type Product = {
  id: string;
  name: string;
  description: string;
  gems: number;
  price: number | null;
  currency: string;
  image: string;
  available: boolean;
};

type Order = {
  id: string;
  productId: string;
  productName: string;
  playerId: string;
  amount: number | null;
  currency: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
};

type Tab = "home" | "products" | "orders" | "notifications" | "account";

const PRODUCTS: Product[] = [
  {
    id: "bundle-small",
    name: "باقة الجواهر الصغيرة",
    description: "باقة شحن صغيرة للاستخدام داخل لعبة Free Fire.",
    gems: 0,
    price: null,
    currency: "USD",
    image:
      "https://placehold.co/600x400/20232A/FFC857.png?text=Free+Fire+Gems",
    available: false,
  },
  {
    id: "bundle-medium",
    name: "باقة الجواهر المتوسطة",
    description: "باقة متوسطة لمحبي اللعبة.",
    gems: 0,
    price: null,
    currency: "USD",
    image:
      "https://placehold.co/600x400/20232A/FF6B22.png?text=Gem+Bundle",
    available: false,
  },
  {
    id: "bundle-large",
    name: "باقة الجواهر الكبيرة",
    description: "باقة كبيرة للاعبين الذين يريدون كمية أكبر من الجواهر.",
    gems: 0,
    price: null,
    currency: "USD",
    image:
      "https://placehold.co/600x400/20232A/FFFFFF.png?text=Premium+Bundle",
    available: false,
  },
  {
    id: "bundle-premium",
    name: "باقة الجواهر المميزة",
    description: "باقة مميزة، بانتظار تفعيل كتالوج المورد المعتمد.",
    gems: 0,
    price: null,
    currency: "USD",
    image:
      "https://placehold.co/600x400/20232A/FFC857.png?text=Premium+Gems",
    available: false,
  },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString("ar", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function ActionButton({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        disabled && styles.disabledButton,
      ]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.productCard}
    >
      <Image source={{ uri: product.image }} style={styles.productImage} />

      <View style={styles.productContent}>
        <Text style={styles.productName}>{product.name}</Text>

        <Text style={styles.mutedText}>
          {product.gems > 0
            ? `${product.gems} جوهرة`
            : "الكمية غير مؤكدة بعد"}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>
            {product.price !== null
              ? `${product.price.toFixed(2)} ${product.currency}`
              : "السعر غير متاح"}
          </Text>

          <View
            style={[
              styles.statusBadge,
              product.available
                ? styles.availableBadge
                : styles.unavailableBadge,
            ]}
          >
            <Text style={styles.badgeText}>
              {product.available ? "متاح" : "غير مفعّل"}
            </Text>
          </View>
        </View>

        <Text style={styles.detailsLink}>عرض التفاصيل ←</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    null
  );
  const [playerId, setPlayerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setOrders(parsed as Order[]);
        }
      }
    } catch {
      Alert.alert("خطأ", "تعذر تحميل سجل الطلبات المحلي.");
    } finally {
      setLoading(false);
    }
  }

  async function saveOrders(nextOrders: Order[]) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextOrders));
    setOrders(nextOrders);
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return PRODUCTS;

    return PRODUCTS.filter((product) =>
      product.name.toLowerCase().includes(query)
    );
  }, [search]);

  function openProduct(product: Product) {
    setSelectedProduct(product);
    setPlayerId("");
    setPaymentMethod("manual");
  }

  async function createLocalOrder() {
    if (!selectedProduct) return;

    if (!/^\d{6,20}$/.test(playerId.trim())) {
      Alert.alert(
        "معرف اللاعب غير صالح",
        "أدخل معرف اللاعب بالأرقام فقط، بطول يتراوح بين 6 و20 رقمًا."
      );
      return;
    }

    if (!selectedProduct.available || selectedProduct.price === null) {
      Alert.alert(
        "الشحن غير متاح حاليًا",
        "لم يتم ربط مزود شحن موثوق لهذا المنتج، كما أن سعره وكميته لم يتأكدا بعد. لم يتم إنشاء طلب شراء أو خصم أي مبلغ."
      );
      return;
    }

    setCreatingOrder(true);

    try {
      const order: Order = {
        id: `LOCAL-${Date.now()}`,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        playerId: playerId.trim(),
        amount: selectedProduct.price,
        currency: selectedProduct.currency,
        createdAt: new Date().toISOString(),
        status: "طلب محلي غير مدفوع",
        paymentStatus: "غير مدفوع",
      };

      await saveOrders([order, ...orders]);

      setSelectedProduct(null);
      setPlayerId("");
      setTab("orders");

      Alert.alert(
        "تم حفظ الطلب محليًا",
        "حُفظ الطلب على هذا الجهاز فقط. لم يتم تحصيل أي مبلغ أو إرسال شحنة إلى اللعبة."
      );
    } catch {
      Alert.alert("خطأ", "تعذر حفظ الطلب على الجهاز.");
    } finally {
      setCreatingOrder(false);
    }
  }

  function renderHeader() {
    return (
      <View style={styles.header}>
        <View style={styles.brandIcon}>
          <Ionicons name="flash" size={27} color={COLORS.background} />
        </View>

        <View style={styles.brandTextContainer}>
          <Text style={styles.brandTitle}>FireCharge</Text>
          <Text style={styles.brandSubtitle}>متجر فاير تشارج</Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setTab("notifications")}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={COLORS.text}
          />
        </TouchableOpacity>
      </View>
    );
  }

  function renderHome() {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.page}
      >
        <View style={styles.hero}>
          <View style={styles.heroTag}>
            <Ionicons name="flash" size={14} color={COLORS.gold} />
            <Text style={styles.heroTagText}>متجر الشحن الرقمي</Text>
          </View>

          <Text style={styles.heroTitle}>
            عالم الجواهر{"\n"}
            <Text style={styles.heroHighlight}>يبدأ من هنا</Text>
          </Text>

          <Text style={styles.heroDescription}>
            اكتشف باقات الشحن وتابع طلباتك من مكان واحد.
          </Text>

          <ActionButton
            title="استكشف المنتجات"
            onPress={() => setTab("products")}
          />

          <View style={styles.heroDecoration}>
            <Ionicons
              name="diamond"
              size={65}
              color="rgba(255,200,87,0.22)"
            />
          </View>
        </View>

        <View style={styles.warningCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={COLORS.gold}
          />

          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>المتجر في مرحلة الإعداد</Text>
            <Text style={styles.mutedText}>
              لم يتم تفعيل مزود الشحن أو الدفع بعد. الأسعار والكميات الحقيقية
              ستظهر بعد ربط المورد.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>باقات الشحن</Text>
          <TouchableOpacity onPress={() => setTab("products")}>
            <Text style={styles.detailsLink}>عرض الكل</Text>
          </TouchableOpacity>
        </View>

        {PRODUCTS.slice(0, 2).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onPress={() => openProduct(product)}
          />
        ))}

        <View style={styles.featureGrid}>
          <Feature
            icon="shield-checkmark-outline"
            title="حماية البيانات"
            subtitle="اهتمام بخصوصيتك"
          />
          <Feature
            icon="receipt-outline"
            title="متابعة الطلب"
            subtitle="عرض السجل المحلي"
          />
          <Feature
            icon="headset-outline"
            title="الدعم الفني"
            subtitle="مركز المساعدة"
          />
          <Feature
            icon="wallet-outline"
            title="الدفع"
            subtitle="التفعيل لاحقًا"
          />
        </View>
      </ScrollView>
    );
  }

  function renderProducts() {
    return (
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>منتجات الشحن</Text>
        <Text style={styles.mutedText}>
          الباقات المعروضة أسماء توضيحية وليست عروضًا رسمية مؤكدة.
        </Text>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن باقة..."
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
        </View>

        {filteredProducts.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد نتائج مطابقة.</Text>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => openProduct(product)}
            />
          ))
        )}
      </ScrollView>
    );
  }

  function renderProductDetails() {
    if (!selectedProduct) return null;

    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.page}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedProduct(null)}
          >
            <Ionicons
              name="arrow-forward"
              size={20}
              color={COLORS.text}
            />
            <Text style={styles.backText}>العودة للمنتجات</Text>
          </TouchableOpacity>

          <Image
            source={{ uri: selectedProduct.image }}
            style={styles.detailsImage}
          />

          <Text style={styles.pageTitle}>{selectedProduct.name}</Text>
          <Text style={styles.mutedText}>
            {selectedProduct.description}
          </Text>

          <View style={styles.infoCard}>
            <InfoRow
              label="الكمية"
              value={
                selectedProduct.gems > 0
                  ? `${selectedProduct.gems} جوهرة`
                  : "لم يتم التأكيد"
              }
            />
            <InfoRow
              label="السعر"
              value={
                selectedProduct.price !== null
                  ? `${selectedProduct.price} ${selectedProduct.currency}`
                  : "غير متاح"
              }
            />
            <InfoRow
              label="حالة المنتج"
              value={
                selectedProduct.available ? "متاح" : "بانتظار التفعيل"
              }
            />
          </View>

          <Text style={styles.fieldLabel}>معرف اللاعب Player ID</Text>

          <TextInput
            value={playerId}
            onChangeText={setPlayerId}
            placeholder="أدخل معرف اللاعب"
            placeholderTextColor={COLORS.muted}
            keyboardType="number-pad"
            style={styles.input}
            textAlign="right"
            maxLength={20}
          />

          <Text style={styles.helperText}>
            تحقق من معرف اللاعب داخل اللعبة قبل أي عملية شراء.
          </Text>

          <Text style={styles.fieldLabel}>وسيلة الدفع</Text>

          <View style={styles.paymentOption}>
            <Ionicons
              name="wallet-outline"
              size={23}
              color={COLORS.gold}
            />

            <View style={styles.paymentTextContainer}>
              <Text style={styles.productName}>الدفع الإلكتروني</Text>
              <Text style={styles.mutedText}>
                غير مفعّل — لا يمكن تحصيل الأموال حاليًا.
              </Text>
            </View>
          </View>

          <View style={styles.warningCard}>
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color={COLORS.gold}
            />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>قبل تأكيد الطلب</Text>
              <Text style={styles.mutedText}>
                يتطلب الشحن الحقيقي ربط مزود معتمد. لا تدخل كلمة مرور حساب
                اللعبة أو بيانات بطاقتك البنكية في هذا التطبيق.
              </Text>
            </View>
          </View>

          <ActionButton
            title={
              creatingOrder
                ? "جارٍ المعالجة..."
                : "متابعة الطلب"
            }
            disabled={creatingOrder}
            onPress={createLocalOrder}
          />

          {creatingOrder && (
            <ActivityIndicator
              color={COLORS.orange}
              style={styles.loader}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  function renderOrders() {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.pageTitle}>طلباتي</Text>

        <Text style={styles.mutedText}>
          هذا السجل محفوظ محليًا على جهازك، وليس سجل طلبات خادم تجاري.
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.orange} />
        ) : orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="receipt-outline"
              size={45}
              color={COLORS.muted}
            />
            <Text style={styles.productName}>لا توجد طلبات محفوظة</Text>
            <Text style={styles.mutedText}>
              ستظهر هنا الطلبات التي تحفظها هذه النسخة محليًا.
            </Text>
            <ActionButton
              title="تصفح المنتجات"
              onPress={() => setTab("products")}
            />
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.productName}>
                  {order.productName}
                </Text>
                <Ionicons
                  name="receipt-outline"
                  size={23}
                  color={COLORS.gold}
                />
              </View>

              <InfoRow label="رقم السجل" value={order.id} />
              <InfoRow label="معرف اللاعب" value={order.playerId} />
              <InfoRow
                label="المبلغ"
                value={
                  order.amount === null
                    ? "غير محدد"
                    : `${order.amount} ${order.currency}`
                }
              />
              <InfoRow label="الحالة" value={order.status} />
              <InfoRow
                label="تاريخ الإنشاء"
                value={formatDate(order.createdAt)}
              />
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  function renderNotifications() {
    return (
      <View style={styles.page}>
        <Text style={styles.pageTitle}>الإشعارات</Text>

        <View style={styles.emptyCard}>
          <Ionicons
            name="notifications-outline"
            size={42}
            color={COLORS.gold}
          />
          <Text style={styles.productName}>لا توجد إشعارات جديدة</Text>
          <Text style={styles.mutedText}>
            إشعارات الدفع والشحن الفعلية تحتاج إلى خادم وخدمة إشعارات.
          </Text>
        </View>
      </View>
    );
  }

  function renderAccount() {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.pageTitle}>حسابي</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={34}
              color={COLORS.gold}
            />
          </View>

          <Text style={styles.sectionTitle}>مرحبًا بك</Text>
          <Text style={styles.mutedText}>
            تصفح المنتجات واحفظ طلباتك على هذا الجهاز.
          </Text>

          <View style={styles.warningCard}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={COLORS.gold}
            />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>
                تسجيل الدخول غير مفعّل
              </Text>
              <Text style={styles.mutedText}>
                لا يوجد حساب مستخدم أو مصادقة سحابية في هذه النسخة.
              </Text>
            </View>
          </View>
        </View>

        <MenuRow
          icon="help-circle-outline"
          title="الأسئلة الشائعة"
          onPress={() =>
            Alert.alert(
              "الأسئلة الشائعة",
              "لن يتم تنفيذ شحن حقيقي حتى يتم ربط مزود شحن معتمد."
            )
          }
        />

        <MenuRow
          icon="headset-outline"
          title="الدعم الفني"
          onPress={() =>
            Alert.alert(
              "الدعم الفني",
              "خدمة الدعم المباشرة غير مفعّلة في هذه النسخة."
            )
          }
        />

        <MenuRow
          icon="document-text-outline"
          title="الشروط والأحكام"
          onPress={() =>
            Alert.alert(
              "الشروط والأحكام",
              "يجب إضافة شروط البيع والاسترداد وسياسة الخصوصية قبل النشر التجاري."
            )
          }
        />

        <MenuRow
          icon="shield-checkmark-outline"
          title="الخصوصية"
          onPress={() =>
            Alert.alert(
              "الخصوصية",
              "تحفظ الطلبات محليًا على الجهاز باستخدام AsyncStorage. لا توجد قاعدة بيانات سحابية."
            )
          }
        />
      </ScrollView>
    );
  }

  function renderContent() {
    if (selectedProduct) return renderProductDetails();

    switch (tab) {
      case "home":
        return renderHome();
      case "products":
        return renderProducts();
      case "orders":
        return renderOrders();
      case "notifications":
        return renderNotifications();
      case "account":
        return renderAccount();
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      {renderHeader()}

      <View style={styles.flex}>{renderContent()}</View>

      {!selectedProduct && (
        <View style={styles.bottomBar}>
          <TabButton
            icon="home-outline"
            title="الرئيسية"
            active={tab === "home"}
            onPress={() => setTab("home")}
          />
          <TabButton
            icon="grid-outline"
            title="المنتجات"
            active={tab === "products"}
            onPress={() => setTab("products")}
          />
          <TabButton
            icon="receipt-outline"
            title="طلباتي"
            active={tab === "orders"}
            onPress={() => setTab("orders")}
          />
          <TabButton
            icon="notifications-outline"
            title="الإشعارات"
            active={tab === "notifications"}
            onPress={() => setTab("notifications")}
          />
          <TabButton
            icon="person-outline"
            title="حسابي"
            active={tab === "account"}
            onPress={() => setTab("account")}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function Feature({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.featureCard}>
      <Ionicons name={icon} size={24} color={COLORS.gold} />
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureSubtitle}>{subtitle}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons
        name="chevron-back"
        size={19}
        color={COLORS.muted}
      />

      <Text style={styles.menuTitle}>{title}</Text>

      <Ionicons
        name={icon}
        size={23}
        color={COLORS.gold}
      />
    </TouchableOpacity>
  );
}

function TabButton({
  icon,
  title,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={22}
        color={active ? COLORS.orange : COLORS.muted}
      />

      <Text
        style={[
          styles.tabTitle,
          active && styles.activeTabTitle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brandIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTextContainer: {
    flex: 1,
    alignItems: "flex-end",
    marginRight: 11,
  },
  brandTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "900",
  },
  brandSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  page: {
    padding: 18,
    paddingBottom: 30,
  },
  hero: {
    backgroundColor: "#22232B",
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#39333A",
  },
  heroTag: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#38302A",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },
  heroTagText: {
    color: COLORS.gold,
    fontSize: 12,
    marginRight: 5,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 31,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 23,
    lineHeight: 43,
  },
  heroHighlight: {
    color: COLORS.orange,
  },
  heroDescription: {
    color: COLORS.muted,
    textAlign: "right",
    fontSize: 14,
    lineHeight: 23,
    marginTop: 10,
    marginBottom: 19,
  },
  heroDecoration: {
    position: "absolute",
    left: 12,
    top: 70,
  },
  button: {
    backgroundColor: COLORS.orange,
    minHeight: 49,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 12,
  },
  secondaryButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  warningCard: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    backgroundColor: "#29251D",
    borderColor: "#59462B",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 22,
  },
  warningContent: {
    flex: 1,
    marginRight: 10,
  },
  warningTitle: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 6,
  },
  mutedText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "right",
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "800",
  },
  productCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 14,
  },
  productImage: {
    width: "100%",
    height: 145,
    backgroundColor: COLORS.card,
  },
  productContent: {
    padding: 15,
  },
  productName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
  },
  priceRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  priceText: {
    color: COLORS.gold,
    fontWeight: "800",
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  availableBadge: {
    backgroundColor: "#17382C",
  },
  unavailableBadge: {
    backgroundColor: "#3B2A21",
  },
  badgeText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "700",
  },
  detailsLink: {
    color: COLORS.orange,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "right",
    marginTop: 12,
  },
  featureGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  featureCard: {
    width: "48%",
    padding: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "flex-end",
  },
  featureTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 11,
  },
  featureSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
    textAlign: "right",
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    marginVertical: 18,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    paddingVertical: 14,
    paddingHorizontal: 9,
    fontSize: 14,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 30,
  },
  backButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 10,
    marginBottom: 15,
  },
  backText: {
    color: COLORS.text,
    fontSize: 14,
    marginRight: 7,
  },
  detailsImage: {
    width: "100%",
    height: 190,
    borderRadius: 18,
    marginBottom: 20,
    backgroundColor: COLORS.card,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginVertical: 17,
  },
  infoRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    gap: 10,
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: "right",
    flexShrink: 0,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 12,
    textAlign: "left",
    flexShrink: 1,
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 9,
    marginTop: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: "right",
    marginTop: 7,
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  paymentTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  loader: {
    marginTop: 14,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    marginTop: 20,
    gap: 12,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginTop: 14,
  },
  orderHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 5,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  menuTitle: {
    flex: 1,
    color: COLORS.text,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    marginRight: 12,
  },
  bottomBar: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 20 : 9,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 58,
    paddingHorizontal: 2,
  },
  tabTitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
  },
  activeTabTitle: {
    color: COLORS.orange,
    fontWeight: "800",
  },
});