/**
 *                  ___________       __            __
 *                  \__    ___/____ _/  |_ _____   |  |
 *                    |    |  /  _ \\   __\\__  \  |  |
 *                    |    | |  |_| ||  |   / __ \_|  |__
 *                    |____|  \____/ |__|  (____  /|____/
 *                                              \/
 *          ___          __                                   __
 *         |   |  ____ _/  |_   ____ _______   ____    ____ _/  |_
 *         |   | /    \\   __\_/ __ \\_  __ \ /    \ _/ __ \\   __\
 *         |   ||   |  \|  |  \  ___/ |  | \/|   |  \\  ___/ |  |
 *         |___||___|  /|__|   \_____>|__|   |___|  / \_____>|__|
 *                  \/                           \/
 *                  ________
 *                 /  _____/_______   ____   __ __ ______
 *                /   \  ___\_  __ \ /  _ \ |  |  \\____ \
 *                \    \_\  \|  | \/|  |_| ||  |  /|  |_| |
 *                 \______  /|__|    \____/ |____/ |   __/
 *                        \/                       |__|
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
 * @copyright Copyright (c) Total Internet Group B.V. https://tig.nl/copyright
 * @license   http://creativecommons.org/licenses/by-nc-nd/3.0/nl/deed.en_US
 */
/*browser:true*/
/*global define*/
define(
    [
        'jquery',
        'Magento_Checkout/js/view/payment/default',
        'Magento_Checkout/js/model/payment/additional-validators',
        'TIG_Buckaroo/js/action/place-order',
        'ko',
        'Magento_Checkout/js/checkout-data',
        'Magento_Checkout/js/action/select-payment-method',
        'BuckarooClientSideEncryption'
    ],
    function (
        $,
        Component,
        additionalValidators,
        placeOrderAction,
        ko,
        checkoutData,
        selectPaymentMethodAction
    ) {
        'use strict';


        /**
         * Add validation methods
         */
        $.validator.addMethod('validateCardNumber', function (value) {
                return BuckarooClientSideEncryption.V001.validateCardNumber(value);
            },
            $.mage.__('Enter a valid creditcard number.')
        );
        $.validator.addMethod('validateCvc', function (value) {
                return BuckarooClientSideEncryption.V001.validateCvc(value);
            },
            $.mage.__('Enter a valid Cvc number.')
        );
        $.validator.addMethod('validateCardHolderName', function (value) {
                return BuckarooClientSideEncryption.V001.validateCardholderName(value);
            },
            $.mage.__('Enter a valid card holder name.')
        );
        $.validator.addMethod('validateYear', function (value) {
                return BuckarooClientSideEncryption.V001.validateYear(value);
            },
            $.mage.__('Enter a valid year number.')
        );
        $.validator.addMethod('validateMonth', function (value) {
                return BuckarooClientSideEncryption.V001.validateMonth(value);
            },
            $.mage.__('Enter a valid month number.')
        );

        return Component.extend(
            {
                defaults: {
                    template        : 'TIG_Buckaroo/payment/tig_buckaroo_creditcards',
                    CardNumber      : null,
                    Cvc             : null,
                    CardHolderName  : null,
                    ExpirationYear  : null,
                    ExpirationMonth : null,
                    EncryptedData   : null
                },
                paymentFeeLabel : window.checkoutConfig.payment.buckaroo.creditcards.paymentFeeLabel,
                currencyCode : window.checkoutConfig.quoteData.quote_currency_code,
                baseCurrencyCode : window.checkoutConfig.quoteData.base_currency_code,

                /**
                 * @override
                 */
                initialize : function (options) {
                    if (checkoutData.getSelectedPaymentMethod() == options.index) {
                        window.checkoutConfig.buckarooFee.title(this.paymentFeeLabel);
                    }

                    return this._super(options);
                },

                initObservable: function () {
                    /** Observed fields **/
                    this._super().observe(
                        [
                            'CardNumber',
                            'Cvc',
                            'CardHolderName',
                            'ExpirationYear',
                            'ExpirationMonth',
                            'EncryptedData'
                        ]
                    );

                    /** Subscribe the fields to validate them on changes. The .valid() method will force the $.validator to run **/
                    // check if this is actually necessary, because this.validate is being run in the computed function below.
                    this.CardNumber.subscribe(this.encryptCardDetails, this);
                    this.Cvc.subscribe(this.encryptCardDetails, this);
                    this.CardHolderName.subscribe(this.encryptCardDetails, this);
                    this.ExpirationYear.subscribe(this.encryptCardDetails, this);
                    this.ExpirationMonth.subscribe(this.encryptCardDetails, this);

                    /** Check used to see if input is valid **/
                    this.buttoncheck = ko.computed(
                        function () {
                            return (
                                this.CardNumber() !== null &&
                                this.Cvc() !== null &&
                                this.CardHolderName() !== null &&
                                this.ExpirationYear() !== null &&
                                this.ExpirationMonth() !== null &&
                                this.EncryptedData() !== null &&
                                this.validate()
                            );
                        },
                        this
                    );

                    return this;
                },

                selectPaymentMethod: function () {
                    window.checkoutConfig.buckarooFee.title(this.paymentFeeLabel);

                    selectPaymentMethodAction(this.getData());
                    checkoutData.setSelectedPaymentMethod(this.item.method);
                    return true;
                },

                /**
                 * Run validation function
                 */
                validate: function () {
                    var elements = $('.' + this.getCode() + ' [data-validate]:not([name*="agreement"])');
                    this.selectPaymentMethod();
                    return elements.valid();
                },

                payWithBaseCurrency: function () {
                    var allowedCurrencies = window.checkoutConfig.payment.buckaroo.creditcards.allowedCurrencies;

                    return allowedCurrencies.indexOf(this.currencyCode) < 0;
                },

                getPayWithBaseCurrencyText: function () {
                    var text = $.mage.__('The transaction will be processed using %s.');

                    return text.replace('%s', this.baseCurrencyCode);
                },

                /**
                 * Place order.
                 *
                 * placeOrderAction has been changed from Magento_Checkout/js/action/place-order to our own version
                 * (TIG_Buckaroo/js/action/place-order) to prevent redirect and handle the response.
                 */
                placeOrder: function (data, event) {
                    var self = this,
                        placeOrder;

                    if (event) {
                        event.preventDefault();
                    }

                    if (this.validate() && additionalValidators.validate()) {
                        this.isPlaceOrderActionAllowed(false);
                        placeOrder = placeOrderAction(this.getData(), this.redirectAfterPlaceOrder, this.messageContainer);

                        $.when(placeOrder).fail(
                            function () {
                                self.isPlaceOrderActionAllowed(true);
                            }
                        ).done(this.afterPlaceOrder.bind(this));
                        return true;
                    }
                    return false;
                },

                afterPlaceOrder: function () {
                    var response = window.checkoutConfig.payment.buckaroo.response;
                    response = $.parseJSON(response);
                    if (response.RequiredAction !== undefined && response.RequiredAction.RedirectURL !== undefined) {
                        window.location.replace(response.RequiredAction.RedirectURL);
                    }
                },

                encryptCardDetails: function () {
                    var self = this;

                    if (this.validate()) {
                        var cardNumber = this.CardNumber();
                        var year =    this.ExpirationYear();
                        var month =    this.ExpirationMonth();
                        var cvc =    this.Cvc();
                        var cardholder =    this.CardHolderName();

                        var getEncryptedData = function(cardNumber, year, month, cvc, cardholder) {
                            BuckarooClientSideEncryption.V001.encryptCardData(cardNumber,
                                year,
                                month,
                                cvc,
                                cardholder,
                                function(encryptedCardData) {
                                    self.EncryptedData(encryptedCardData);
                                });
                        };
                        getEncryptedData(cardNumber, year, month, cvc, cardholder);

                    }
                },

                getData: function () {
                    return {
                        "method": this.item.method,
                        "po_number": null,
                        "additional_data": {
                            "customer_encrypteddata" : this.EncryptedData(),
                            "customer_creditcardcompany" : 'Mastercard'
                        }
                    };
                },

                getMinExpirationYear: function () {
                    return new Date().getFullYear();
                },

                getMaxExpirationYear: function () {
                    return new Date().getFullYear() + 10;
                }
            }
        );
    }
);
