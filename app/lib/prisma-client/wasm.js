
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  username: 'username',
  publicId: 'publicId',
  password: 'password',
  name: 'name',
  email: 'email',
  role: 'role',
  phone: 'phone',
  createdAt: 'createdAt'
};

exports.Prisma.ApplicationScalarFieldEnum = {
  id: 'id',
  applicantName: 'applicantName',
  phone: 'phone',
  nid: 'nid',
  password: 'password',
  email: 'email',
  capitalAmount: 'capitalAmount',
  durationMonths: 'durationMonths',
  purpose: 'purpose',
  nomineeName: 'nomineeName',
  relation: 'relation',
  fatherName: 'fatherName',
  address: 'address',
  status: 'status',
  submittedAt: 'submittedAt',
  referredBy: 'referredBy'
};

exports.Prisma.MemberScalarFieldEnum = {
  memberId: 'memberId',
  publicId: 'publicId',
  name: 'name',
  phone: 'phone',
  nid: 'nid',
  category: 'category',
  capitalInvested: 'capitalInvested',
  termMonths: 'termMonths',
  monthlyProfit: 'monthlyProfit',
  monthlyCapitalRefund: 'monthlyCapitalRefund',
  monthlyTotalPayout: 'monthlyTotalPayout',
  joinDate: 'joinDate',
  status: 'status',
  nomineeName: 'nomineeName',
  relation: 'relation',
  fatherName: 'fatherName',
  address: 'address',
  referredBy: 'referredBy',
  buyerReferredBy: 'buyerReferredBy',
  buyerParent: 'buyerParent',
  buyerLeft: 'buyerLeft',
  buyerRight: 'buyerRight',
  investorParent: 'investorParent',
  investorLeft: 'investorLeft',
  investorRight: 'investorRight'
};

exports.Prisma.PayoutScalarFieldEnum = {
  id: 'id',
  memberId: 'memberId',
  memberName: 'memberName',
  monthNumber: 'monthNumber',
  dueDate: 'dueDate',
  profitAmount: 'profitAmount',
  capitalRefund: 'capitalRefund',
  totalPayout: 'totalPayout',
  status: 'status',
  method: 'method',
  createdAt: 'createdAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  name: 'name',
  brand: 'brand',
  category: 'category',
  price: 'price',
  description: 'description',
  imageUrl: 'imageUrl',
  imageUrls: 'imageUrls',
  stockStatus: 'stockStatus'
};

exports.Prisma.InquiryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  phone: 'phone',
  message: 'message',
  date: 'date',
  status: 'status'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  name: 'name'
};

exports.Prisma.SystemLogScalarFieldEnum = {
  id: 'id',
  action: 'action',
  operator: 'operator',
  status: 'status',
  timestamp: 'timestamp'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  username: 'username',
  productId: 'productId',
  productName: 'productName',
  price: 'price',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.WalletScalarFieldEnum = {
  username: 'username',
  balance: 'balance'
};

exports.Prisma.TransactionScalarFieldEnum = {
  id: 'id',
  username: 'username',
  amount: 'amount',
  type: 'type',
  description: 'description',
  date: 'date'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  username: 'username',
  message: 'message',
  type: 'type',
  timestamp: 'timestamp',
  isRead: 'isRead'
};

exports.Prisma.WithdrawalScalarFieldEnum = {
  id: 'id',
  username: 'username',
  amount: 'amount',
  method: 'method',
  paymentNumber: 'paymentNumber',
  status: 'status',
  requestedAt: 'requestedAt',
  processedAt: 'processedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  Application: 'Application',
  Member: 'Member',
  Payout: 'Payout',
  Product: 'Product',
  Inquiry: 'Inquiry',
  Category: 'Category',
  SystemLog: 'SystemLog',
  Order: 'Order',
  Wallet: 'Wallet',
  Transaction: 'Transaction',
  Notification: 'Notification',
  Withdrawal: 'Withdrawal'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
