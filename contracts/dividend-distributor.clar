;; DividendDistributor.clar
;; Core contract for distributing dividends in the Decentralized Energy Cooperative
;; Handles periodic dividend calculations based on member contributions,
;; distribution from treasury, claim mechanisms, and governance controls.

;; Constants
(define-constant ERR-UNAUTHORIZED u100)
(define-constant ERR-INVALID-PERIOD u101)
(define-constant ERR-NO-CONTRIBUTIONS u102)
(define-constant ERR-ALREADY-CLAIMED u103)
(define-constant ERR-PAUSED u104)
(define-constant ERR-INVALID-AMOUNT u105)
(define-constant ERR-NO-FUNDS u106)
(define-constant ERR-INVALID-TOKEN u107)
(define-constant ERR-PERIOD-NOT-ENDED u108)
(define-constant ERR-INVALID-CONFIG u109)
(define-constant ERR-MAX-PERIODS-REACHED u110)

(define-constant MAX-PERIODS u1000) ;; Max historical periods to prevent unbounded growth
(define-constant DEFAULT_PAYOUT_TOKEN 'SP000000000000000000002Q6VF78.byzantion-stx) ;; Example FT token, can be STX or others

;; Data Variables
(define-data-var contract-admin principal tx-sender)
(define-data-var is-paused bool false)
(define-data-var current-period uint u0)
(define-data-var period-duration uint u144) ;; ~1 day in blocks, configurable
(define-data-var last-period-start uint block-height)
(define-data-var min-contribution-threshold uint u1000000) ;; 1 STX microstacks equivalent
(define-data-var treasury-contract principal tx-sender) ;; Set to actual Treasury.clar principal
(define-data-var contribution-tracker-contract principal tx-sender) ;; Set to ContributionTracker.clar
(define-data-var governance-contract principal tx-sender) ;; For admin changes
(define-data-var payout-token principal DEFAULT_PAYOUT_TOKEN) ;; Configurable payout token

;; Data Maps
(define-map period-info
  { period-id: uint }
  {
    start-block: uint,
    end-block: uint,
    total-contributions: uint,
    total-dividends: uint,
    distributed: bool
  }
)

(define-map member-shares
  { period-id: uint, member: principal }
  {
    contribution: uint,
    share-percentage: uint, ;; In basis points (10000 = 100%)
    claimed: bool,
    claim-amount: uint
  }
)

(define-map historical-claims
  { member: principal, period-id: uint }
  { amount: uint, timestamp: uint }
)

(define-map config-params
  (string-ascii 32)
  uint
)

;; Private Functions
(define-private (is-admin (caller principal))
  (is-eq caller (var-get contract-admin))
)

(define-private (calculate-share (contribution uint) (total uint))
  (if (> total u0)
    (/ (* contribution u10000) total) ;; Basis points
    u0
  )
)

(define-private (get-total-contributions (period uint))
  (default-to u0
    (get total-contributions (map-get? period-info {period-id: period}))
  )
)

(define-private (transfer-from-treasury (amount uint) (recipient principal) (token principal))
  ;; Mock call to Treasury.clar - in real, use contract-call?
  ;; For now, assume success; in prod: (try! (contract-call? treasury-contract withdraw amount recipient token))
  (ok true)
)

(define-private (get-member-contribution (member principal) (period uint))
  ;; Mock call to ContributionTracker.clar
  ;; In prod: (contract-call? contribution-tracker-contract get-contribution member period)
  (ok u0) ;; Placeholder
)

;; Public Functions
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-UNAUTHORIZED))
    (var-set contract-admin new-admin)
    (ok true)
  )
)

(define-public (pause-contract)
  (begin
    (asserts! (is-admin tx-sender) (err ERR-UNAUTHORIZED))
    (var-set is-paused true)
    (ok true)
  )
)

(define-public (unpause-contract)
  (begin
    (asserts! (is-admin tx-sender) (err ERR-UNAUTHORIZED))
    (var-set is-paused false)
    (ok true)
  )
)

(define-public (set-period-duration (new-duration uint))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-UNAUTHORIZED))
    (asserts! (> new-duration u0) (err ERR-INVALID-CONFIG))
    (var-set period-duration new-duration)
    (ok true)
  )
)

(define-public (set-min-contribution-threshold (new-threshold uint))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-UNAUTHORIZED))
    (var-set min-contribution-threshold new-threshold)
    (ok true)
  )
)

(define-public (set-treasury-contract (new-treasury principal))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-UNAUTHORIZED))
    (var-set treasury-contract new-treasury)
    (ok true)
  )
)

(define-public (set-contribution-tracker (new-tracker principal))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-UNAUTHORIZED))
    (var-set contribution-tracker-contract new-tracker)
    (ok true)
  )
)

(define-public (set-payout-token (new-token principal))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-UNAUTHORIZED))
    (var-set payout-token new-token)
    (ok true)
  )
)

(define-public (start-new-period)
  (let
    (
      (current (var-get current-period))
      (next-period (+ current u1))
      (now block-height)
      (last-start (var-get last-period-start))
      (expected-end (+ last-start (var-get period-duration)))
    )
    (asserts! (not (var-get is-paused)) (err ERR-PAUSED))
    (asserts! (>= now expected-end) (err ERR-PERIOD-NOT-ENDED))
    (asserts! (< current MAX-PERIODS) (err ERR-MAX-PERIODS-REACHED))
    (map-set period-info
      {period-id: current}
      {
        start-block: last-start,
        end-block: now,
        total-contributions: u0, ;; To be calculated later
        total-dividends: u0,
        distributed: false
      }
    )
    (var-set current-period next-period)
    (var-set last-period-start now)
    (print { event: "new-period-started", period: next-period, start: now })
    (ok next-period)
  )
)

(define-public (calculate-period-dividends (period uint) (total-dividends uint))
  (let
    (
      (period-data (map-get? period-info {period-id: period}))
      (total-contrib (get-total-contributions period))
    )
    (asserts! (is-admin tx-sender) (err ERR-UNAUTHORIZED))
    (asserts! (is-some period-data) (err ERR-INVALID-PERIOD))
    (asserts! (not (get distributed (unwrap-panic period-data))) (err ERR-ALREADY-CLAIMED))
    (asserts! (> total-dividends u0) (err ERR-INVALID-AMOUNT))
    (asserts! (> total-contrib u0) (err ERR-NO-CONTRIBUTIONS))
    (map-set period-info
      {period-id: period}
      (merge (unwrap-panic period-data)
        { total-dividends: total-dividends, distributed: true }
      )
    )
    (print { event: "dividends-calculated", period: period, total: total-dividends })
    (ok true)
  )
)

(define-public (claim-dividends (period uint))
  (let
    (
      (claimant tx-sender)
      (period-data (map-get? period-info {period-id: period}))
      (share-data (map-get? member-shares {period-id: period, member: claimant}))
      (contrib (try! (get-member-contribution claimant period)))
      (total-contrib (get-total-contributions period))
      (share (calculate-share contrib total-contrib))
      (total-div (default-to u0 (get total-dividends period-data)))
      (claim-amount (/ (* total-div share) u10000))
    )
    (asserts! (not (var-get is-paused)) (err ERR-PAUSED))
    (asserts! (is-some period-data) (err ERR-INVALID-PERIOD))
    (asserts! (get distributed (unwrap-panic period-data)) (err ERR-PERIOD-NOT-ENDED))
    (asserts! (>= contrib (var-get min-contribution-threshold)) (err ERR-NO-CONTRIBUTIONS))
    (asserts! (not (default-to true (get claimed share-data))) (err ERR-ALREADY-CLAIMED))
    (asserts! (> claim-amount u0) (err ERR-INVALID-AMOUNT))
    (try! (transfer-from-treasury claim-amount claimant (var-get payout-token)))
    (map-set member-shares
      {period-id: period, member: claimant}
      {
        contribution: contrib,
        share-percentage: share,
        claimed: true,
        claim-amount: claim-amount
      }
    )
    (map-set historical-claims
      {member: claimant, period-id: period}
      { amount: claim-amount, timestamp: block-height }
    )
    (print { event: "dividends-claimed", member: claimant, period: period, amount: claim-amount })
    (ok claim-amount)
  )
)

;; Read-Only Functions
(define-read-only (get-current-period)
  (var-get current-period)
)

(define-read-only (get-period-info (period uint))
  (map-get? period-info {period-id: period})
)

(define-read-only (get-member-share (period uint) (member principal))
  (map-get? member-shares {period-id: period, member: member})
)

(define-read-only (get-historical-claim (member principal) (period uint))
  (map-get? historical-claims {member: member, period-id: period})
)

(define-read-only (get-contract-config)
  {
    admin: (var-get contract-admin),
    paused: (var-get is-paused),
    period-duration: (var-get period-duration),
    min-threshold: (var-get min-contribution-threshold),
    treasury: (var-get treasury-contract),
    tracker: (var-get contribution-tracker-contract),
    payout-token: (var-get payout-token)
  }
)

;; Additional robust features: Bulk claims, emergency withdraw, etc.
(define-public (bulk-claim-dividends (periods (list 10 uint)))
  (fold bulk-claim-iter periods (ok u0))
)

(define-private (bulk-claim-iter (period uint) (prev (response uint uint)))
  (match prev
    sum (let ((claim (try! (claim-dividends period))))
          (ok (+ sum claim)))
    err (err err)
  )
)

(define-public (emergency-withdraw (amount uint) (token principal))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-UNAUTHORIZED))
    (try! (transfer-from-treasury amount tx-sender token))
    (print { event: "emergency-withdraw", amount: amount, token: token })
    (ok true)
  )
)

(define-public (update-total-contributions (period uint) (new-total uint))
  (let ((period-data (map-get? period-info {period-id: period})))
    (asserts! (is-eq tx-sender (var-get contribution-tracker-contract)) (err ERR-UNAUTHORIZED))
    (asserts! (is-some period-data) (err ERR-INVALID-PERIOD))
    (map-set period-info
      {period-id: period}
      (merge (unwrap-panic period-data) { total-contributions: new-total })
    )
    (ok true)
  )
)