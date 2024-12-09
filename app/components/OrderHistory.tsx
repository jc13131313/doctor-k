import * as htmlToImage from "html-to-image";
import { Order } from "@/app/order/page";
import { useState, useEffect, useRef } from "react";
import PaymentModal from "./PaymentModal";
import { db } from "@/lib/firebase.config";
import { doc, updateDoc } from "firebase/firestore";

interface OrderHistoryProps {
  orders: Order[];
  isLoadingOrders: boolean;
}

const OrderHistory = ({ orders, isLoadingOrders }: OrderHistoryProps) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [notifiedOrders, setNotifiedOrders] = useState<string[]>([]);
  const [showBlockedNotificationModal, setShowBlockedNotificationModal] = useState(false);
  const [showOrderStatusModal, setShowOrderStatusModal] = useState(false);
  const [orderStatusMessage, setOrderStatusMessage] = useState<string>('');
  const [orderStatusTitle, setOrderStatusTitle] = useState<string>('');
  const receiptRef = useRef<HTMLDivElement>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [showCancelConfirmationModal, setShowCancelConfirmationModal] = useState(false);

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

  useEffect(() => {
    orders.forEach((order) => {
      if (
        order.id &&
        !notifiedOrders.includes(order.id) &&
        (order.status === "accepted" ||
          order.status === "ready" ||
          order.status === "cancelled")
      ) {
        showOrderStatusModalDialog(order);
        setNotifiedOrders((prev) => [...prev, order.id as string]);
      }
    });
  }, [orders, notifiedOrders]);

  const showOrderStatusModalDialog = (order: Order) => {
    let title = '';
    let body = '';

    switch (order.status) {
      case "accepted":
        title = "Order Accepted!";
        body = `Your order #${order.orderNumber} has been accepted.<br>Total: ₱${order.total.toFixed(2)}`;
        break;
      case "ready":
        title = "Order Ready to Serve!";
        body = `Your order #${order.orderNumber} is ready to serve.`;
        break;
      case "cancelled":
        title = "Order Cancelled!";
        body = `Your order #${order.orderNumber} has been cancelled.`;
        break;
      default:
        return; // Don't show modal for other statuses
    }

    setOrderStatusTitle(title);
    setOrderStatusMessage(body);
    setShowOrderStatusModal(true);
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

  const handleCancelClick = (order: Order) => {
    setOrderToCancel(order);
    setShowCancelConfirmationModal(true);
  };

  const handleConfirmCancel = async () => {
    if (orderToCancel) {
      try {
        const orderRef = doc(db, "orders", orderToCancel.id);
        await updateDoc(orderRef, {
          status: "cancelled"
        });

        // Update local state
        // You might need to implement a function to update the orders in the parent component
        // For now, we'll just update the local state
        // updateOrders(updatedOrders);

        showOrderStatusModalDialog({ ...orderToCancel, status: "cancelled" });
        setShowCancelConfirmationModal(false);
        setOrderToCancel(null);
      } catch (error) {
        console.error("Error cancelling order:", error);
        // You might want to show an error message to the user here
      }
    }
  };

  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Order History</h2>

      {isLoadingOrders ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : orders && orders.length > 0 ? (
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
                  <p className="text-sm text-gray-600">Order #: {order.orderNumber}</p>
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

              {order.status === "pending" && (
                <button
                  onClick={() => handleCancelClick(order)}
                  className="w-full mt-3 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  Cancel Order
                </button>
              )}

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

      {showOrderStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-semibold text-center">{orderStatusTitle}</h3>
            <p className="mt-2 text-center" dangerouslySetInnerHTML={{ __html: orderStatusMessage }} />
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowOrderStatusModal(false)}
                className="w-full mt-3 px-4 py-2 bg-gray-200 text-orange-600 rounded-md hover:bg-orange-600 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-semibold text-center">Confirm Cancellation</h3>
            <p className="mt-2 text-center">Are you sure you want to cancel this order?</p>
            <div className="flex justify-between mt-4">
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Yes, Cancel Order
              </button>
              <button
                onClick={() => setShowCancelConfirmationModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                No, Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;

