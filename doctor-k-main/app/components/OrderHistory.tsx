import { Order } from "@/app/order/page";
import { useState, useEffect, useRef } from "react";
import * as htmlToImage from "html-to-image";
import PaymentModal from "./PaymentModal";

interface OrderHistoryProps {
  orders: Order[];
  isLoadingOrders: boolean;
}

const OrderHistory = ({ orders, isLoadingOrders }: OrderHistoryProps) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [notifiedOrders, setNotifiedOrders] = useState<string[]>([]);
  const [showBlockedNotificationModal, setShowBlockedNotificationModal] =
    useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Function to get the status color based on the order's status
  function getStatusColor(status: Order["status"]): string {
    switch (status) {
      case "accepted":
        return "#FFD700"; // gold
      case "paid":
        return "#4CAF50"; // green
      case "ready":
        return "#FFA500"; // orange
      case "served":
        return "#3494BC"; // blue
      case "cancelled":
        return "#FF4444"; // red
      default:
        return "#FF8C00"; // orange for pending
    }
  }

  // Request notification permission and notify relevant order statuses
  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission().then((permission) => {
        if (permission !== "granted") {
          setShowBlockedNotificationModal(true);
        }
      });
    }

    orders.forEach((order) => {
      if (
        order.id &&
        !notifiedOrders.includes(order.id) &&
        (order.status === "accepted" ||
          order.status === "ready" ||
          order.status === "cancelled")
      ) {
        sendStatusNotification(order);
        setNotifiedOrders((prev) => [...prev, order.id as string]);
      }
    });
  }, [orders, notifiedOrders]);

  // Function to send a notification
  const sendStatusNotification = (order: Order) => {
    if (Notification.permission === "granted") {
      let notificationTitle = "";
      let notificationBody = "";

      switch (order.status) {
        case "accepted":
          notificationTitle = "Order Accepted!";
          notificationBody = `Your order #${order.orderNumber} has been accepted.`;
          break;
        case "ready":
          notificationTitle = "Order Ready to Serve!";
          notificationBody = `Your order #${order.orderNumber} is ready to serve.`;
          break;
        case "cancelled":
          notificationTitle = "Order Cancelled!";
          notificationBody = `Your order #${order.orderNumber} has been cancelled.`;
          break;
        default:
          return; // Don't show a notification for other statuses
      }

      // Create and show notification
      new Notification(notificationTitle, {
        body: notificationBody,
        icon: "/logo.png", // Optional icon
      });
    }
  };

  const handlePaymentSubmit = (method: string) => {
    if (!selectedOrder?.id) return;
    console.log(
      `Payment processed for order ${selectedOrder.id} with ${method}`
    );
  };

  const handlePaymentClick = (order: Order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setSelectedOrder(null);
  };

  const handleReceiptClick = (order: Order) => {
    setSelectedOrder(order);
    setShowReceipt(true);
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setSelectedOrder(null);
  };

  const downloadReceiptAsImage = async () => {
    if (!receiptRef.current) return;

    try {
      const dataUrl = await htmlToImage.toPng(receiptRef.current);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Order_${selectedOrder?.id}_Receipt.png`;
      link.click();
    } catch (error) {
      console.error("Error generating receipt image:", error);
    }
  };

  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Order History</h2>

      {isLoadingOrders ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order, index) => (
            <div
              key={`${order.id}-${index}`}
              className="bg-white rounded-lg shadow-md p-4 space-y-3 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">
                    <time dateTime={new Date(order.createdAt).toISOString()}>
                      {new Date(order.createdAt).toLocaleString()}
                    </time>
                  </p>
                  <p className="font-medium text-orange-600">
                    Total: ₱{order.total.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Table #{order.tableNumber}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium`}
                  style={{
                    backgroundColor: getStatusColor(order.status),
                    color: "#fff",
                  }}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              <div className="space-y-2">
                {order.items.map((item, itemIndex) => (
                  <div
                    key={`${item.id}-${itemIndex}`}
                    className="flex justify-between items-center text-sm text-gray-600 py-1 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="font-medium">x{item.quantity}</span>
                  </div>
                ))}
              </div>

              {order.status === "accepted" &&
                (!order.paymentStatus || order.paymentStatus === "pending") ? (
                  <button
                    onClick={() => handlePaymentClick(order)}
                    className="w-full mt-3 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                  >
                    Process Payment
                  </button>
                ) : order.paymentStatus === "paid" ? (
                  <button
                    onClick={() => handleReceiptClick(order)}
                    className="w-full mt-3 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    View Receipt
                  </button>
                ) : order.paymentStatus === "processing" && (
                  <div className="w-full mt-3 px-4 py-2 bg-green-100 text-green-800 rounded-md text-center">
                    Proceed to the counter - Thank You!
                  </div>
                )}

            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8" role="status">
          No order history
        </p>
      )}

      {showReceipt && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <div
              ref={receiptRef}
              className="text-sm font-mono p-4 border border-gray-300 rounded-lg"
            >
              <h3 className="text-lg font-bold mb-4 text-center">DR.K</h3>
              <h3 className="text-lg font-bold mb-4 text-center">Receipt</h3>
              <div className="text-left">
              <p>Order No: {selectedOrder.orderNumber}</p>
                <p>Order ID: {selectedOrder.id}</p>
                <p>Table: {selectedOrder.tableNumber}</p>
                <p>Total: ₱{selectedOrder.total.toFixed(2)}</p>
                <p>Payment: {selectedOrder.paymentMethod}</p>
                <div className="my-4">
                  <div className="border-t border-dotted border-gray-400 mb-2"></div>
                  <h4 className="font-bold">Items:</h4>
                  <ul>
                    {selectedOrder.items.map((item) => (
                      <li key={item.id} className="flex justify-between">
                        <span>{item.name}</span>
                        <span>{`x${item.quantity} - ₱${item.price.toFixed(2)}`}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <button
                onClick={downloadReceiptAsImage}
                className="w-l mt-3 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                Download Receipt
              </button>
              <button
                onClick={handleCloseReceipt}
                className="w-l mt-3 px-4 py-2 bg-gray-200 text-orange-600 rounded-md hover:bg-orange-600 transition-colors hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showBlockedNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <p className="text-center text-gray-800">
              Notifications are blocked. Please enable them to receive order
              updates.
            </p>
            <button
              onClick={() => setShowBlockedNotificationModal(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-200 text-orange-600 rounded-md hover:bg-orange-600 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handleCloseModal}
        onSubmit={handlePaymentSubmit}
        orderTotal={selectedOrder?.total || 0}
        orderId={selectedOrder?.id || ""}
      />
    </div>
  );
};

export default OrderHistory;
