-- ConnectionRequest.connectedAppId becomes one-to-many (renewal history)
-- instead of one-to-one: an org's connection to a given external app is a
-- single ConnectedApp row that gets renewed in place, not duplicated, while
-- every request that led to or renewed it still gets its own history row.
-- Two separate statements, ADD before DROP, so the FK on connectedAppId
-- always has a covering index at every point (required by MySQL; TiDB
-- additionally rejects doing both in one combined ALTER TABLE statement).
ALTER TABLE `connection_requests` ADD INDEX `connection_requests_connectedAppId_idx` (`connectedAppId`);
ALTER TABLE `connection_requests` DROP INDEX `connection_requests_connectedAppId_key`;
