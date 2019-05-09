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
define(
    [
        'jquery',
        'ko',
        'Magento_Checkout/js/model/quote',
        'mage/translate',
        'BuckarooSDK'
    ],
    function (
        $,
        ko,
        quote,
    ) {
        'use strict';

        var transactionResult = ko.observable(null);

        return {
            transactionResult : transactionResult,

            showPayButton: function () {
                var self = this;

                var applepayOptions = new BuckarooSdk.ApplePay.ApplePayOptions(
                    window.checkoutConfig.payment.buckaroo.applepay.storeName,
                    quote.shippingAddress().countryId,
                    window.checkoutConfig.quoteData.quote_currency_code,
                    window.checkoutConfig.payment.buckaroo.applepay.cultureCode,
                    window.checkoutConfig.payment.buckaroo.applepay.guid,
                    self.processLineItems(),
                    self.processTotalLineItems(),
                    "shipping",
                    self.shippingMethodInformation(),
                    self.captureFunds.bind(this)
                );

                if (typeof ApplePaySession !== 'undefined') {
                    var payment = new BuckarooSdk.ApplePay.ApplePayPayment('#apple-pay-wrapper', applepayOptions);
                    payment.showPayButton('black');
                }
            },

            /**
             * @returns {{amount: string, label, type: string}[]}
             */
            processLineItems: function () {
                var subTotal = parseFloat(quote.totals().subtotal).toFixed(2);
                var shippingInclTax = parseFloat(quote.totals().shipping_incl_tax).toFixed(2);

                return [
                    {label: $.mage.__('Subtotal'), amount: subTotal, type: 'final'},
                    {label: $.mage.__('Delivery'), amount: shippingInclTax, type: 'final'}
                ];
            },

            /**
             * @returns {{amount: string, label: *, type: string}}
             */
            processTotalLineItems: function () {
                var shippingInclTax = parseFloat(quote.totals().shipping_incl_tax).toFixed(2);
                var storeName = window.checkoutConfig.payment.buckaroo.applepay.storeName;

                return {label: storeName, amount: shippingInclTax, type: 'final'};
            },

            /**
             * @returns {{identifier: (string), amount: string, label: string, detail}[]}
             */
            shippingMethodInformation: function () {
                var shippingInclTax = parseFloat(quote.totals().shipping_incl_tax).toFixed(2);
                var shippingTitle = quote.shippingMethod().carrier_title + ' (' + quote.shippingMethod().method_title + ')';

                return [{
                    label: shippingTitle,
                    amount: shippingInclTax,
                    identifier: quote.shippingMethod().method_code,
                    detail: $.mage.__('Shipping Method selected during checkout.')
                }];
            },

            /**
             * @param payment
             * @returns {Promise<{errors: Array, status: *}>}
             */
            captureFunds: function (payment) {
                var authorizationResult = {
                    status: ApplePaySession.STATUS_SUCCESS,
                    errors: []
                };

                this.transactionResult('hoi TIG Test');

                $('#debug-wrapper').removeClass('d-none');
                $('#debug').html(JSON.stringify(payment));

                if (authorizationResult.status !== ApplePaySession.STATUS_SUCCESS) {
                    var errors = authorizationResult.errors.map(function (error) {
                        return error.message
                    });

                    this.showError($.mage.__('Your payment could not be processed: ') + errors.join(' '));

                    authorizationResult.errors.forEach(function (error) {
                        console.error(error.message + ' (' + error.contactField + ': ' + error.code + ').');
                    })
                }

                return Promise.resolve(authorizationResult)
            }
        };
    }
);
