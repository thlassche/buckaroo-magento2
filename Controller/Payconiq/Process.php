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
namespace TIG\Buckaroo\Controller\Payconiq;

use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\App\Action\Action;
use Magento\Framework\App\Action\Context;
use Magento\Framework\App\ResponseInterface;
use Magento\Framework\Controller\ResultInterface;
use Magento\Framework\Exception\LocalizedException;
use Magento\Sales\Api\Data\TransactionSearchResultInterface;
use Magento\Sales\Api\TransactionRepositoryInterface;
use Magento\Sales\Model\Order;
use TIG\Buckaroo\Model\ConfigProvider\Account;
use TIG\Buckaroo\Service\Sales\Order\Cancel as OrderCancel;
use TIG\Buckaroo\Service\Sales\Quote\Recreate as QuoteRecreate;

class Process extends Action
{
    /** @var Order */
    private $order;

    /** @var SearchCriteriaBuilder */
    private $searchCriteriaBuilder;

    /** @var TransactionRepositoryInterface */
    private $transactionRepository;

    /** @var Account */
    private $account;
    /**
     * @var OrderCancel
     */
    private $orderCancel;
    /**
     * @var QuoteRecreate
     */
    private $quoteRecreate;

    /**
     * @param Context                        $context
     * @param SearchCriteriaBuilder          $searchCriteriaBuilder
     * @param TransactionRepositoryInterface $transactionRepository
     * @param Account                        $account
     * @param OrderCancel                    $orderCancel
     * @param QuoteRecreate                  $quoteRecreate
     */
    public function __construct(
        Context $context,
        SearchCriteriaBuilder $searchCriteriaBuilder,
        TransactionRepositoryInterface $transactionRepository,
        Account $account,
        OrderCancel $orderCancel,
        QuoteRecreate $quoteRecreate
    ) {
        parent::__construct($context);

        $this->searchCriteriaBuilder = $searchCriteriaBuilder;
        $this->transactionRepository = $transactionRepository;
        $this->account = $account;
        $this->orderCancel = $orderCancel;
        $this->quoteRecreate = $quoteRecreate;
    }

    /**
     * @return ResponseInterface|ResultInterface
     * @throws LocalizedException
     * @throws \TIG\Buckaroo\Exception
     */
    public function execute()
    {
        if (!$this->getTransactionKey()) {
            $this->_forward('defaultNoRoute');
            return;
        }

        $order = $this->getOrder();
        $this->orderCancel->cancel($order);
        $this->quoteRecreate->recreate($order);

        $cancelledErrorMessage = __(
            'According to our system, you have canceled the payment. If this is not the case, please contact us.'
        );
        $this->messageManager->addErrorMessage($cancelledErrorMessage);

        $store = $order->getStore();
        $url = $this->account->getFailureRedirect($store);

        return $this->_redirect($url);
    }

    /**
     * @return bool|mixed
     */
    private function getTransactionKey()
    {
        $transactionKey = $this->getRequest()->getParam('transaction_key');

        if (empty($transactionKey) || strlen($transactionKey) <= 0) {
            return false;
        }

        return $transactionKey;
    }

    /**
     * @return Order
     * @throws \TIG\Buckaroo\Exception
     */
    private function getOrder()
    {
        if ($this->order != null) {
            return $this->order;
        }

        $list = $this->getList();

        if ($list->getTotalCount() <= 0) {
            throw new \TIG\Buckaroo\Exception(__('There was no order found by transaction Id'));
        }

        $items = $list->getItems();
        $transaction = array_shift($items);
        $this->order = $transaction->getOrder();

        return $this->order;
    }

    /**
     * @return TransactionSearchResultInterface
     * @throws \TIG\Buckaroo\Exception
     */
    private function getList()
    {
        $transactionKey = $this->getTransactionKey();

        if (!$transactionKey) {
            throw new \TIG\Buckaroo\Exception(__('There was no order found by transaction Id'));
        }

        $searchCriteria = $this->searchCriteriaBuilder->addFilter('txn_id', $transactionKey);
        $searchCriteria->setPageSize(1);
        $list = $this->transactionRepository->getList($searchCriteria->create());

        return $list;
    }
}
