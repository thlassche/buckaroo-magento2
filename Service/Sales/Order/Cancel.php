<?php
/**
 *
 *          ..::..
 *     ..::::::::::::..
 *   ::'''''':''::'''''::
 *   ::..  ..:  :  ....::
 *   ::::  :::  :  :   ::
 *   ::::  :::  :  ''' ::
 *   ::::..:::..::.....::
 *     ''::::::::::::''
 *          ''::''
 *
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Creative Commons License.
 * It is available through the world-wide-web at this URL:
 * http://creativecommons.org/licenses/by-nc-nd/3.0/nl/deed.en_US
 * If you are unable to obtain it through the world-wide-web, please send an email
 * to servicedesk@tig.nl so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade this module to newer
 * versions in the future. If you wish to customize this module for your
 * needs please contact servicedesk@tig.nl for more information.
 *
 * @copyright   Copyright (c) Total Internet Group B.V. https://tig.nl/copyright
 * @license     http://creativecommons.org/licenses/by-nc-nd/3.0/nl/deed.en_US
 */
namespace TIG\Buckaroo\Service\Sales\Order;

use Magento\Framework\Exception\LocalizedException;
use Magento\Sales\Model\Order;
use Magento\Sales\Model\Order\Payment;
use TIG\Buckaroo\Model\ConfigProvider\Account;
use TIG\Buckaroo\Model\OrderStatusFactory;

class Cancel
{
    /** @var Account */
    private $account;

    /** @var OrderStatusFactory */
    private $orderStatusFactory;

    /**
     * @param OrderStatusFactory $orderStatusFactory
     * @param Account            $account
     */
    public function __construct(
        OrderStatusFactory $orderStatusFactory,
        Account $account
    ) {
        $this->orderStatusFactory = $orderStatusFactory;
        $this->account = $account;
    }

    /**
     * @param Order $order
     *
     * @throws \Exception
     * @throws LocalizedException
     */
    public function cancel($order)
    {
        $store = $order->getStore();
        $cancelOnFailed = $this->account->getCancelOnFailed($store);

        if ($cancelOnFailed && $order->canCancel()) {
            $this->performCancel($order);
        }

        $this->updateStatus($order);
    }

    /**
     * @param Order $order
     *
     * @throws \Exception
     * @throws LocalizedException
     */
    private function performCancel($order)
    {
        /** @var Payment $payment */
        $payment = $order->getPayment();
        $paymentCode = $payment->getMethodInstance()->getCode();

        if ($paymentCode == 'tig_buckaroo_afterpay' || $paymentCode == 'tig_buckaroo_afterpay2') {
            $payment->setAdditionalInformation('buckaroo_failed_authorize', 1);
            $payment->save();
        }

        $order->cancel()->save();
    }

    /**
     * @param Order $order
     *
     * @throws \Exception
     */
    private function updateStatus($order)
    {
        $comment = __('Payment status : Cancelled by consumer');
        $newStatus = $this->orderStatusFactory->get(890, $order);

        if ($order->getState() != Order::STATE_CANCELED) {
            $newStatus = false;
        }

        $order->addStatusHistoryComment($comment, $newStatus);
        $order->save();
    }
}
