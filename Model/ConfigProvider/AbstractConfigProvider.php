<?php
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
 * to servicedesk@totalinternetgroup.nl so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade this module to newer
 * versions in the future. If you wish to customize this module for your
 * needs please contact servicedesk@totalinternetgroup.nl for more information.
 *
 * @copyright   Copyright (c) 2015 Total Internet Group B.V. (http://www.totalinternetgroup.nl)
 * @license     http://creativecommons.org/licenses/by-nc-nd/3.0/nl/deed.en_US
 */
namespace TIG\Buckaroo\Model\ConfigProvider;

use \Magento\Checkout\Model\ConfigProviderInterface;

abstract class AbstractConfigProvider implements ConfigProviderInterface
{

    /**
     * @var string
     */
    protected $xpathPrefix = 'XPATH_';

    /**
     * @param \Magento\Framework\App\Config\ScopeConfigInterface $scopeConfig
     */
    public function __construct(
        \Magento\Framework\App\Config\ScopeConfigInterface $scopeConfig
    ) {
        $this->scopeConfig = $scopeConfig;
    }

    /**
     * Allows getSomethingValue calls to be turned into XPATH names and returns the value IF they exist on the
     * extending child class.
     *
     * @param string $method
     * @param mixed $params
     *
     * @return mixed|null
     */
    public function __call($method, $params)
    {
        /**
         * By default, assume there's no constant
         */
        $constant = null;
        /**
         * If $method starts with get, we've got a contender
         */
        if (substr($method, 0, 3) === 'get') {
            /**
             * Remove get from the method name
             */
            $camel = substr($method, 3);
            /**
             * And turn CamelCasedValue into Camel_Cased_Value
             */
            $camelScored = preg_replace(
                '/(^[^A-Z]+|[A-Z][^A-Z]+)/',
                '_$1',
                $camel
            );

            /**
             * Get the actual class name
             */
            $class = get_class($this);
            $classParts = explode('\\', $class);
            $className = end($classParts);

            /**
             * Uppercase and append it to the XPATH prefix & child class' name
             */
            $constant = strtoupper('static::' . $this->getXpathPrefix() . $className . $camelScored);
        }
        if ($constant && defined($constant) && !empty(constant($constant))) {
            return $this->getConfigFromXpath(constant($constant));
        }
        return null;
    }

    /**
     * {@inheritdoc}
     */
    public function getConfig()
    {
        return false;
    }

    /**
     * Set the Xpath Prefix
     *
     * @param $xpathPrefix
     *
     * @return $this
     */
    public function setXpathPrefix($xpathPrefix)
    {
        $this->xpathPrefix = $xpathPrefix;
        return $this;
    }

    /**
     * Return Xpath Prefix
     *
     * @return string
     */
    public function getXpathPrefix()
    {
        return $this->xpathPrefix;
    }

    /**
     * Return the config value for the given Xpath
     *
     * @return mixed
     */
    protected function getConfigFromXpath($xpath)
    {
        return $this->scopeConfig->getValue(
            $xpath,
            \Magento\Store\Model\ScopeInterface::SCOPE_STORE
        );
    }

}