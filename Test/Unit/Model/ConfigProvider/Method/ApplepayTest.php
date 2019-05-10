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
 * to support@tig.nl so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade this module to newer
 * versions in the future. If you wish to customize this module for your
 * needs please contact support@tig.nl for more information.
 *
 * @copyright   Copyright (c) Total Internet Group B.V. https://tig.nl/copyright
 * @license     http://creativecommons.org/licenses/by-nc-nd/3.0/nl/deed.en_US
 */
namespace TIG\Buckaroo\Test\Unit\Model\ConfigProvider\Method;

use Magento\Framework\Locale\Resolver;
use Magento\Store\Model\ScopeInterface;
use Magento\Store\Model\StoreManagerInterface;
use TIG\Buckaroo\Helper\PaymentFee;
use TIG\Buckaroo\Model\ConfigProvider\Account;
use TIG\Buckaroo\Model\Method\Applepay as ApplepayMethod;
use TIG\Buckaroo\Test\BaseTest;
use TIG\Buckaroo\Model\ConfigProvider\Method\Applepay;
use \Magento\Framework\App\Config\ScopeConfigInterface;

class ApplepayTest extends BaseTest
{
    protected $instanceClass = Applepay::class;

    public function getConfigProvider()
    {
        return [
            'active' => [
                true,
                [
                    'payment' => [
                        'buckaroo' => [
                            'applepay' => [
                                'paymentFeeLabel' => 'Fee',
                                'allowedCurrencies' => ['EUR'],
                                'storeName' => 'TIG Webshop',
                                'cultureCode' => 'nl',
                                'guid' => 'GUID12345'
                            ]
                        ]
                    ]
                ]
            ],
            'inactive' => [
                false,
                []
            ]
        ];
    }

    /**
     * @param $active
     * @param $expected
     *
     * @dataProvider getConfigProvider
     */
    public function testGetConfig($active, $expected)
    {
        $scopeConfigMock = $this->getFakeMock(ScopeConfigInterface::class)
            ->setMethods(['getValue'])
            ->getMockForAbstractClass();
        $scopeConfigMock->expects($this->atLeastOnce())
            ->method('getValue')
            ->withConsecutive(
                [Applepay::XPATH_APPLEPAY_ACTIVE, ScopeInterface::SCOPE_STORE],
                [Applepay::XPATH_ALLOWED_CURRENCIES, ScopeInterface::SCOPE_STORE, null]
            )
            ->willReturnOnConsecutiveCalls($active, 'EUR');

        $expectedCount = 0;
        if ($active) {
            $expectedCount = 1;
        }

        $paymentFeeMock = $this->getFakeMock(PaymentFee::class)->setMethods(['getBuckarooPaymentFeeLabel'])->getMock();
        $paymentFeeMock->expects($this->exactly($expectedCount))
            ->method('getBuckarooPaymentFeeLabel')
            ->with(ApplepayMethod::PAYMENT_METHOD_CODE)
            ->willReturn('Fee');

        $storeManagerMock = $this->getFakeMock(StoreManagerInterface::class)
            ->setMethods(['getStore', 'getName'])
            ->getMockForAbstractClass();
        $storeManagerMock->expects($this->exactly($expectedCount))->method('getStore')->willReturnSelf();
        $storeManagerMock->expects($this->exactly($expectedCount))->method('getName')->willReturn('TIG Webshop');

        $localeResolverMock = $this->getFakeMock(Resolver::class)->setMethods(['getLocale'])->getMock();
        $localeResolverMock->expects($this->exactly($expectedCount))->method('getLocale')->willReturn('nl_NL');

        $accountConfigMock = $this->getFakeMock(Account::class)->setMethods(['getMerchantGuid'])->getMock();
        $accountConfigMock->expects($this->exactly($expectedCount))->method('getMerchantGuid')->willReturn('GUID12345');

        $instance = $this->getInstance([
            'scopeConfig' => $scopeConfigMock,
            'paymentFeeHelper' => $paymentFeeMock,
            'storeManager' => $storeManagerMock,
            'localeResolver' => $localeResolverMock,
            'configProvicerAccount' => $accountConfigMock
        ]);

        $result = $instance->getConfig();
        $this->assertEquals($expected, $result);
    }

    public function getPaymentFeeProvider()
    {
        return [
            'null value' => [
                null,
                false
            ],
            'false value' => [
                false,
                false
            ],
            'empty int value' => [
                0,
                false
            ],
            'empty float value' => [
                0.00,
                false
            ],
            'empty string value' => [
                '',
                false
            ],
            'int value' => [
                1,
                1
            ],
            'float value' => [
                2.34,
                2.34
            ],
            'string value' => [
                '5.67',
                5.67
            ],
        ];
    }

    /**
     * @param $value
     * @param $expected
     *
     * @dataProvider getPaymentFeeProvider
     */
    public function testGetPaymentFee($value, $expected)
    {
        $scopeConfigMock = $this->getFakeMock(ScopeConfigInterface::class)
            ->setMethods(['getValue'])
            ->getMockForAbstractClass();
        $scopeConfigMock->expects($this->once())
            ->method('getValue')
            ->with(Applepay::XPATH_APPLEPAY_PAYMENT_FEE, ScopeInterface::SCOPE_STORE)
            ->willReturn($value);

        $instance = $this->getInstance(['scopeConfig' => $scopeConfigMock]);
        $result = $instance->getPaymentFee();

        $this->assertEquals($expected, $result);
    }
}
