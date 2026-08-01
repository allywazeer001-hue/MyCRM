-- ConnectionRequest.connectedAppId becomes one-to-many (renewal history)
-- instead of one-to-one: an org's connection to a given external app is a
-- single ConnectedApp row that gets renewed in place, not duplicated, while
-- every request that led to or renewed it still gets its own history row.
-- Both index changes must be in one ALTER TABLE so the FK on connectedAppId
-- always has a covering index (MySQL rejects dropping it standalone).
ALTER TABLE `connection_requests`
  ADD INDEX `connection_requests_connectedAppId_idx` (`connectedAppId`),
  DROP INDEX `connection_requests_connectedAppId_key`;
